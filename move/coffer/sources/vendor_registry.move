module coffer::vendor_registry;

use coffer::treasury::{Self, Treasury, TreasuryAdminCap};

const ETreasuryMismatch: u64 = 1;
const EVendorInactive: u64 = 2;
const EVendorMismatch: u64 = 3;
const EVendorLimitExceeded: u64 = 4;
const EBucketMismatch: u64 = 5;
const EVendorPolicyExpired: u64 = 6;
const EVendorCapMismatch: u64 = 7;
const EVendorSenderMismatch: u64 = 8;

public struct VendorPolicy has key {
    id: UID,
    treasury_id: ID,
    vendor: address,
    active: bool,
    max_payment: u64,
    allowed_bucket: u8,
    valid_until_ms: u64,
}

public struct VendorCap has key, store {
    id: UID,
    policy_id: ID,
    vendor: address,
}

public fun register<T>(
    admin_cap: &TreasuryAdminCap,
    treasury: &Treasury<T>,
    vendor: address,
    active: bool,
    max_payment: u64,
    allowed_bucket: u8,
    valid_until_ms: u64,
    ctx: &mut TxContext,
): VendorCap {
    treasury::assert_admin(admin_cap, treasury);
    let (policy, cap) = new(
        treasury::id(treasury),
        vendor,
        active,
        max_payment,
        allowed_bucket,
        valid_until_ms,
        ctx,
    );
    transfer::share_object(policy);
    cap
}

fun new(
    treasury_id: ID,
    vendor: address,
    active: bool,
    max_payment: u64,
    allowed_bucket: u8,
    valid_until_ms: u64,
    ctx: &mut TxContext,
): (VendorPolicy, VendorCap) {
    let policy = VendorPolicy {
        id: object::new(ctx),
        treasury_id,
        vendor,
        active,
        max_payment,
        allowed_bucket,
        valid_until_ms,
    };
    let cap = VendorCap {
        id: object::new(ctx),
        policy_id: object::id(&policy),
        vendor,
    };
    (policy, cap)
}

public(package) fun assert_can_submit(
    cap: &VendorCap,
    policy: &VendorPolicy,
    treasury_id: ID,
    ctx: &TxContext,
): address {
    assert!(cap.policy_id == object::id(policy), EVendorCapMismatch);
    assert!(cap.vendor == tx_context::sender(ctx), EVendorSenderMismatch);
    assert!(policy.treasury_id == treasury_id, ETreasuryMismatch);
    assert!(policy.vendor == cap.vendor, EVendorMismatch);
    cap.vendor
}

public(package) fun assert_payment_allowed(
    policy: &VendorPolicy,
    treasury_id: ID,
    vendor: address,
    amount: u64,
    bucket: u8,
    now_ms: u64,
) {
    assert!(policy.treasury_id == treasury_id, ETreasuryMismatch);
    assert!(policy.active, EVendorInactive);
    assert!(policy.vendor == vendor, EVendorMismatch);
    assert!(amount <= policy.max_payment, EVendorLimitExceeded);
    assert!(policy.allowed_bucket == bucket, EBucketMismatch);
    assert!(now_ms <= policy.valid_until_ms, EVendorPolicyExpired);
}

#[test_only]
public fun create_for_testing(
    treasury_id: ID,
    vendor: address,
    max_payment: u64,
    allowed_bucket: u8,
    valid_until_ms: u64,
    ctx: &mut TxContext,
): VendorPolicy {
    VendorPolicy {
        id: object::new(ctx),
        treasury_id,
        vendor,
        active: true,
        max_payment,
        allowed_bucket,
        valid_until_ms,
    }
}

#[test_only]
public fun create_registration_for_testing(
    treasury_id: ID,
    vendor: address,
    active: bool,
    max_payment: u64,
    allowed_bucket: u8,
    valid_until_ms: u64,
    ctx: &mut TxContext,
): (VendorPolicy, VendorCap) {
    new(
        treasury_id,
        vendor,
        active,
        max_payment,
        allowed_bucket,
        valid_until_ms,
        ctx,
    )
}

#[test_only]
public fun destroy_for_testing(policy: VendorPolicy) {
    let VendorPolicy {
        id,
        treasury_id: _,
        vendor: _,
        active: _,
        max_payment: _,
        allowed_bucket: _,
        valid_until_ms: _,
    } = policy;
    object::delete(id);
}

#[test_only]
public fun destroy_registration_for_testing(policy: VendorPolicy, cap: VendorCap) {
    destroy_for_testing(policy);
    let VendorCap { id, policy_id: _, vendor: _ } = cap;
    object::delete(id);
}
