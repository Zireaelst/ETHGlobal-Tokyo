module coffer::vendor_registry;

const ETreasuryMismatch: u64 = 1;
const EVendorInactive: u64 = 2;
const EVendorMismatch: u64 = 3;
const EVendorLimitExceeded: u64 = 4;
const EBucketMismatch: u64 = 5;
const EVendorPolicyExpired: u64 = 6;

public struct VendorPolicy has key {
    id: UID,
    treasury_id: ID,
    vendor: address,
    active: bool,
    max_payment: u64,
    allowed_bucket: u8,
    valid_until_ms: u64,
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
