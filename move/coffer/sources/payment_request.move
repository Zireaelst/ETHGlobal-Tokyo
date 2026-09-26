module coffer::payment_request;

use coffer::mandate::{Self, AgentCap, AgentMandate};
use coffer::receipt;
use coffer::treasury::{Self, Treasury};
use coffer::vendor_registry::{Self, VendorPolicy};
use sui::clock::{Self, Clock};
use sui::coin;

const ETreasuryMismatch: u64 = 1;
const ERequestNotPending: u64 = 2;
const ERequestNotDue: u64 = 3;
const ERequestExpired: u64 = 4;
const EPolicyVersionMismatch: u64 = 5;

const PENDING: u8 = 0;
const PAID: u8 = 5;

public struct PaymentRequest has key {
    id: UID,
    treasury_id: ID,
    vendor: address,
    amount: u64,
    bucket: u8,
    due_at_ms: u64,
    expires_at_ms: u64,
    policy_version: u64,
    status: u8,
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

public fun is_paid(request: &PaymentRequest): bool { request.status == PAID }

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
        vendor,
        amount,
        bucket,
        due_at_ms,
        expires_at_ms,
        policy_version,
        status: PENDING,
    }
}

#[test_only]
public fun destroy_for_testing(request: PaymentRequest) {
    let PaymentRequest {
        id,
        treasury_id: _,
        vendor: _,
        amount: _,
        bucket: _,
        due_at_ms: _,
        expires_at_ms: _,
        policy_version: _,
        status: _,
    } = request;
    object::delete(id);
}
