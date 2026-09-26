module coffer::treasury;

use std::string::String;
use sui::balance::{Self, Balance};
use sui::coin::{Self, Coin};

const EAdminCapMismatch: u64 = 1;
const ETreasuryPaused: u64 = 2;
const EInsufficientBalance: u64 = 3;
const EInvalidBucket: u64 = 4;
const ESameBucket: u64 = 5;

const OPERATING: u8 = 0;
const RESERVE: u8 = 1;
const VENDOR_COMMITTED: u8 = 2;

public struct Treasury<phantom T> has key {
    id: UID,
    organization: String,
    operating: Balance<T>,
    reserve: Balance<T>,
    vendor_committed: Balance<T>,
    paused: bool,
    policy_version: u64,
    total_paid: u64,
}

public struct TreasuryAdminCap has key, store {
    id: UID,
    treasury_id: ID,
}

public fun create<T>(organization: String, ctx: &mut TxContext): TreasuryAdminCap {
    let (treasury, admin_cap) = new<T>(organization, ctx);
    transfer::share_object(treasury);
    admin_cap
}

fun new<T>(organization: String, ctx: &mut TxContext): (Treasury<T>, TreasuryAdminCap) {
    let treasury = Treasury {
        id: object::new(ctx),
        organization,
        operating: balance::zero(),
        reserve: balance::zero(),
        vendor_committed: balance::zero(),
        paused: false,
        policy_version: 1,
        total_paid: 0,
    };
    let treasury_id = object::id(&treasury);
    let admin_cap = TreasuryAdminCap {
        id: object::new(ctx),
        treasury_id,
    };
    (treasury, admin_cap)
}

public fun deposit_operating<T>(treasury: &mut Treasury<T>, coin: Coin<T>) {
    treasury.operating.join(coin::into_balance(coin));
}

public fun admin_rebalance<T>(
    admin_cap: &TreasuryAdminCap,
    treasury: &mut Treasury<T>,
    from_bucket: u8,
    to_bucket: u8,
    amount: u64,
) {
    assert_admin(admin_cap, treasury);
    assert!(!treasury.paused, ETreasuryPaused);
    assert!(from_bucket != to_bucket, ESameBucket);

    let moved = take_from_bucket(treasury, from_bucket, amount);
    join_into_bucket(treasury, to_bucket, moved);
}

public fun pause<T>(admin_cap: &TreasuryAdminCap, treasury: &mut Treasury<T>) {
    assert_admin(admin_cap, treasury);
    treasury.paused = true;
}

public fun unpause<T>(admin_cap: &TreasuryAdminCap, treasury: &mut Treasury<T>) {
    assert_admin(admin_cap, treasury);
    treasury.paused = false;
}

public(package) fun assert_admin<T>(admin_cap: &TreasuryAdminCap, treasury: &Treasury<T>) {
    assert!(admin_cap.treasury_id == object::id(treasury), EAdminCapMismatch);
}

fun take_from_bucket<T>(treasury: &mut Treasury<T>, bucket: u8, amount: u64): Balance<T> {
    if (bucket == OPERATING) {
        assert!(treasury.operating.value() >= amount, EInsufficientBalance);
        treasury.operating.split(amount)
    } else if (bucket == RESERVE) {
        assert!(treasury.reserve.value() >= amount, EInsufficientBalance);
        treasury.reserve.split(amount)
    } else if (bucket == VENDOR_COMMITTED) {
        assert!(treasury.vendor_committed.value() >= amount, EInsufficientBalance);
        treasury.vendor_committed.split(amount)
    } else {
        abort EInvalidBucket
    }
}

fun join_into_bucket<T>(treasury: &mut Treasury<T>, bucket: u8, funds: Balance<T>) {
    if (bucket == OPERATING) {
        treasury.operating.join(funds);
    } else if (bucket == RESERVE) {
        treasury.reserve.join(funds);
    } else if (bucket == VENDOR_COMMITTED) {
        treasury.vendor_committed.join(funds);
    } else {
        abort EInvalidBucket
    }
}

public fun operating_bucket(): u8 { OPERATING }
public fun reserve_bucket(): u8 { RESERVE }
public fun vendor_committed_bucket(): u8 { VENDOR_COMMITTED }

public fun id<T>(treasury: &Treasury<T>): ID { object::id(treasury) }
public fun operating_balance<T>(treasury: &Treasury<T>): u64 { treasury.operating.value() }
public fun reserve_balance<T>(treasury: &Treasury<T>): u64 { treasury.reserve.value() }
public fun vendor_committed_balance<T>(treasury: &Treasury<T>): u64 {
    treasury.vendor_committed.value()
}
public fun is_paused<T>(treasury: &Treasury<T>): bool { treasury.paused }
public fun policy_version<T>(treasury: &Treasury<T>): u64 { treasury.policy_version }
public fun total_paid<T>(treasury: &Treasury<T>): u64 { treasury.total_paid }
public fun organization<T>(treasury: &Treasury<T>): &String { &treasury.organization }

public(package) fun withdraw_for_payment<T>(
    treasury: &mut Treasury<T>,
    bucket: u8,
    amount: u64,
): Balance<T> {
    assert!(!treasury.paused, ETreasuryPaused);
    take_from_bucket(treasury, bucket, amount)
}

public(package) fun record_payment<T>(treasury: &mut Treasury<T>, amount: u64) {
    treasury.total_paid = treasury.total_paid + amount;
}

#[test_only]
public fun create_for_testing<T>(ctx: &mut TxContext): (Treasury<T>, TreasuryAdminCap) {
    new<T>(std::string::utf8(b"Test Organization"), ctx)
}

#[test_only]
public fun deposit_operating_for_testing<T>(treasury: &mut Treasury<T>, funds: Balance<T>) {
    treasury.operating.join(funds);
}

#[test_only]
public fun destroy_for_testing<T>(treasury: Treasury<T>, admin_cap: TreasuryAdminCap) {
    let Treasury {
        id,
        organization: _,
        operating,
        reserve,
        vendor_committed,
        paused: _,
        policy_version: _,
        total_paid: _,
    } = treasury;
    let TreasuryAdminCap { id: admin_id, treasury_id: _ } = admin_cap;
    object::delete(id);
    object::delete(admin_id);
    balance::destroy_for_testing(operating);
    balance::destroy_for_testing(reserve);
    balance::destroy_for_testing(vendor_committed);
}
