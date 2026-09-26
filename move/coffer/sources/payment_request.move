module coffer::payment_request;

use std::string::String;
use coffer::authorization::{Self, AuthorizationTicket};
use coffer::mandate::{Self, AgentCap, AgentMandate};
use coffer::receipt;
use coffer::treasury::{Self, Treasury};
use coffer::vendor_registry::{Self, VendorCap, VendorPolicy};
use sui::clock::{Self, Clock};
use sui::coin;

const ETreasuryMismatch: u64 = 1;
const ERequestNotPending: u64 = 2;
const ERequestNotDue: u64 = 3;
const ERequestExpired: u64 = 4;
const EPolicyVersionMismatch: u64 = 5;
const EActionAlreadyBound: u64 = 6;
const EInvalidActionDigestLength: u64 = 7;
const ERequestVendorMismatch: u64 = 8;

const PENDING: u8 = 0;
const PAID: u8 = 5;

public struct PaymentRequest has key {
    id: UID,
    treasury_id: ID,
    requester: address,
    vendor: address,
    amount: u64,
    bucket: u8,
    due_at_ms: u64,
    expires_at_ms: u64,
    policy_version: u64,
    invoice_digest: vector<u8>,
    walrus_blob_id: String,
    seal_policy_id: ID,
    action_digest: vector<u8>,
    status: u8,
}

public fun submit<T>(
    vendor_cap: &VendorCap,
    vendor_policy: &VendorPolicy,
    treasury: &Treasury<T>,
    amount: u64,
    bucket: u8,
    due_at_ms: u64,
    expires_at_ms: u64,
    policy_version: u64,
    invoice_digest: vector<u8>,
    walrus_blob_id: String,
    seal_policy_id: ID,
    action_digest: vector<u8>,
    ctx: &mut TxContext,
) {
    let request = new_request(
        vendor_cap,
        vendor_policy,
        treasury,
        amount,
        bucket,
        due_at_ms,
        expires_at_ms,
        policy_version,
        invoice_digest,
        walrus_blob_id,
        seal_policy_id,
        action_digest,
        ctx,
    );
    transfer::share_object(request);
}

fun new_request<T>(
    vendor_cap: &VendorCap,
    vendor_policy: &VendorPolicy,
    treasury: &Treasury<T>,
    amount: u64,
    bucket: u8,
    due_at_ms: u64,
    expires_at_ms: u64,
    policy_version: u64,
    invoice_digest: vector<u8>,
    walrus_blob_id: String,
    seal_policy_id: ID,
    action_digest: vector<u8>,
    ctx: &mut TxContext,
): PaymentRequest {
    let treasury_id = treasury::id(treasury);
    let vendor = vendor_registry::assert_can_submit(
        vendor_cap,
        vendor_policy,
        treasury_id,
        ctx,
    );
    PaymentRequest {
        id: object::new(ctx),
        treasury_id,
        requester: tx_context::sender(ctx),
        vendor,
        amount,
        bucket,
        due_at_ms,
        expires_at_ms,
        policy_version,
        invoice_digest,
        walrus_blob_id,
        seal_policy_id,
        action_digest,
        status: PENDING,
    }
}

public fun bind_world_action(
    vendor_cap: &VendorCap,
    vendor_policy: &VendorPolicy,
    request: &mut PaymentRequest,
    action_digest: vector<u8>,
    ctx: &TxContext,
) {
    assert!(request.status == PENDING, ERequestNotPending);
    let vendor = vendor_registry::assert_can_submit(
        vendor_cap,
        vendor_policy,
        request.treasury_id,
        ctx,
    );
    assert!(vendor == request.vendor, ERequestVendorMismatch);
    assert!(request.action_digest.is_empty(), EActionAlreadyBound);
    assert!(action_digest.length() == 32, EInvalidActionDigestLength);
    request.action_digest = action_digest;
}

public fun execute_within_mandate<T>(
    agent_cap: &AgentCap,
    agent_mandate: &mut AgentMandate,
    vendor_policy: &VendorPolicy,
    treasury: &mut Treasury<T>,
    request: &mut PaymentRequest,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let treasury_id = treasury::id(treasury);
    let now_ms = clock::timestamp_ms(clock);
    assert!(request.treasury_id == treasury_id, ETreasuryMismatch);
    assert!(request.status == PENDING, ERequestNotPending);
    assert!(now_ms >= request.due_at_ms, ERequestNotDue);
    assert!(now_ms <= request.expires_at_ms, ERequestExpired);
    assert!(request.policy_version == treasury::policy_version(treasury), EPolicyVersionMismatch);

    vendor_registry::assert_payment_allowed(
        vendor_policy,
        treasury_id,
        request.vendor,
        request.amount,
        request.bucket,
        now_ms,
    );
    mandate::authorize_and_record(
        agent_cap,
        agent_mandate,
        treasury_id,
        request.amount,
        request.policy_version,
        now_ms,
        ctx,
    );

    let funds = treasury::withdraw_for_payment(treasury, request.bucket, request.amount);
    let payment = coin::from_balance(funds, ctx);
    transfer::public_transfer(payment, request.vendor);
    request.status = PAID;
    treasury::record_payment(treasury, request.amount);
    receipt::emit_paid_within_mandate(
        object::id(request),
        treasury_id,
        request.vendor,
        request.amount,
        request.policy_version,
    );
}

public fun execute_with_authorization<T>(
    ticket: AuthorizationTicket,
    treasury: &mut Treasury<T>,
    request: &mut PaymentRequest,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let treasury_id = treasury::id(treasury);
    let request_id = object::id(request);
    let now_ms = clock::timestamp_ms(clock);
    assert!(request.treasury_id == treasury_id, ETreasuryMismatch);
    assert!(request.status == PENDING, ERequestNotPending);
    assert!(now_ms >= request.due_at_ms, ERequestNotDue);
    assert!(now_ms <= request.expires_at_ms, ERequestExpired);
    assert!(request.policy_version == treasury::policy_version(treasury), EPolicyVersionMismatch);

    authorization::validate_and_consume(
        ticket,
        treasury_id,
        request_id,
        request.vendor,
        &request.action_digest,
        request.amount,
        now_ms,
    );

    let funds = treasury::withdraw_for_payment(treasury, request.bucket, request.amount);
    let payment = coin::from_balance(funds, ctx);
    transfer::public_transfer(payment, request.vendor);
    request.status = PAID;
    treasury::record_payment(treasury, request.amount);
    receipt::emit_human_authorized_exception(
        request_id,
        treasury_id,
        request.vendor,
        request.amount,
        request.policy_version,
    );
}

public fun id(request: &PaymentRequest): ID { object::id(request) }
public fun is_paid(request: &PaymentRequest): bool { request.status == PAID }
public fun requester(request: &PaymentRequest): address { request.requester }
public fun invoice_digest(request: &PaymentRequest): &vector<u8> { &request.invoice_digest }
public fun walrus_blob_id(request: &PaymentRequest): &String { &request.walrus_blob_id }
public fun seal_policy_id(request: &PaymentRequest): ID { request.seal_policy_id }
public fun action_digest(request: &PaymentRequest): &vector<u8> { &request.action_digest }

#[test_only]
public fun create_for_testing(
    treasury_id: ID,
    vendor: address,
    amount: u64,
    bucket: u8,
    due_at_ms: u64,
    expires_at_ms: u64,
    policy_version: u64,
    ctx: &mut TxContext,
): PaymentRequest {
    PaymentRequest {
        id: object::new(ctx),
        treasury_id,
        requester: vendor,
        vendor,
        amount,
        bucket,
        due_at_ms,
        expires_at_ms,
        policy_version,
        invoice_digest: vector[],
        walrus_blob_id: std::string::utf8(b""),
        seal_policy_id: treasury_id,
        action_digest: vector[0],
        status: PENDING,
    }
}

#[test_only]
public fun create_for_testing_with_digest(
    treasury_id: ID,
    vendor: address,
    amount: u64,
    bucket: u8,
    due_at_ms: u64,
    expires_at_ms: u64,
    policy_version: u64,
    action_digest: vector<u8>,
    ctx: &mut TxContext,
): PaymentRequest {
    PaymentRequest {
        id: object::new(ctx),
        treasury_id,
        requester: vendor,
        vendor,
        amount,
        bucket,
        due_at_ms,
        expires_at_ms,
        policy_version,
        invoice_digest: vector[],
        walrus_blob_id: std::string::utf8(b""),
        seal_policy_id: treasury_id,
        action_digest,
        status: PENDING,
    }
}

#[test_only]
public fun submit_for_testing<T>(
    vendor_cap: &VendorCap,
    vendor_policy: &VendorPolicy,
    treasury: &Treasury<T>,
    amount: u64,
    bucket: u8,
    due_at_ms: u64,
    expires_at_ms: u64,
    policy_version: u64,
    invoice_digest: vector<u8>,
    walrus_blob_id: String,
    seal_policy_id: ID,
    action_digest: vector<u8>,
    ctx: &mut TxContext,
): PaymentRequest {
    new_request(
        vendor_cap,
        vendor_policy,
        treasury,
        amount,
        bucket,
        due_at_ms,
        expires_at_ms,
        policy_version,
        invoice_digest,
        walrus_blob_id,
        seal_policy_id,
        action_digest,
        ctx,
    )
}

#[test_only]
public fun destroy_for_testing(request: PaymentRequest) {
    let PaymentRequest {
        id,
        treasury_id: _,
        requester: _,
        vendor: _,
        amount: _,
        bucket: _,
        due_at_ms: _,
        expires_at_ms: _,
        policy_version: _,
        invoice_digest: _,
        walrus_blob_id: _,
        seal_policy_id: _,
        action_digest: _,
        status: _,
    } = request;
    object::delete(id);
}
