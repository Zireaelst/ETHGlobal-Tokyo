#[test_only]
module coffer::treasury_tests;

use coffer::treasury;
use sui::balance;

public struct TEST_COIN has drop {}

#[test]
fun deposit_and_rebalance_between_buckets() {
    let ctx = &mut tx_context::dummy();
    let (mut treasury, admin_cap) = treasury::create_for_testing<TEST_COIN>(ctx);

    treasury::deposit_operating_for_testing(
        &mut treasury,
        balance::create_for_testing<TEST_COIN>(1_000),
    );
    treasury::admin_rebalance(
        &admin_cap,
        &mut treasury,
        treasury::operating_bucket(),
        treasury::vendor_committed_bucket(),
        300,
    );

    assert!(treasury::operating_balance(&treasury) == 700);
    assert!(treasury::reserve_balance(&treasury) == 0);
    assert!(treasury::vendor_committed_balance(&treasury) == 300);

    treasury::destroy_for_testing(treasury, admin_cap);
}

#[test, expected_failure(abort_code = 2, location = coffer::treasury)]
fun paused_treasury_rejects_rebalance() {
    let ctx = &mut tx_context::dummy();
    let (mut treasury, admin_cap) = treasury::create_for_testing<TEST_COIN>(ctx);
    treasury::deposit_operating_for_testing(
        &mut treasury,
        balance::create_for_testing<TEST_COIN>(100),
    );
    treasury::pause(&admin_cap, &mut treasury);

    treasury::admin_rebalance(
        &admin_cap,
        &mut treasury,
        treasury::operating_bucket(),
        treasury::reserve_bucket(),
        10,
    );

    treasury::destroy_for_testing(treasury, admin_cap);
}

#[test, expected_failure(abort_code = 3, location = coffer::treasury)]
fun rebalance_rejects_insufficient_source_balance() {
    let ctx = &mut tx_context::dummy();
    let (mut treasury, admin_cap) = treasury::create_for_testing<TEST_COIN>(ctx);
    treasury::deposit_operating_for_testing(
        &mut treasury,
        balance::create_for_testing<TEST_COIN>(100),
    );

    treasury::admin_rebalance(
        &admin_cap,
        &mut treasury,
        treasury::operating_bucket(),
        treasury::reserve_bucket(),
        101,
    );

    treasury::destroy_for_testing(treasury, admin_cap);
}
