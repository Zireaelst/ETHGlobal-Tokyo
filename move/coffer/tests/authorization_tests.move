#[test_only]
module coffer::authorization_tests;

use coffer::authorization::{Self, WorldVerifierCap};
use coffer::payment_request::{Self, PaymentRequest};
use coffer::treasury::{Self, Treasury, TreasuryAdminCap};
use sui::balance;
use sui::clock::{Self, Clock};

const VENDOR: address = @0xCAFE;

public struct TEST_COIN has drop {}

#[test]
fun exact_world_authorization_executes_exception_payment() {
    let ctx = &mut tx_context::dummy();
    let (mut treasury, admin_cap) = funded_treasury(ctx);
    let action_digest = vector[7, 8, 9];
    let mut request = payment_request::create_for_testing_with_digest(
        treasury::id(&treasury),
        VENDOR,
        240,
        treasury::vendor_committed_bucket(),
        1_000,
        5_000,
        1,
        action_digest,
        ctx,
    );
    let verifier_cap = authorization::create_verifier_for_testing(
        treasury::id(&treasury),
        ctx,
    );
    let ticket = authorization::mint_ticket(
        &verifier_cap,
        treasury::id(&treasury),
        payment_request::id(&request),
        VENDOR,
        vector[7, 8, 9],
        240,
        2_000,
        vector[1, 2, 3],
        ctx,
    );
    let mut clock = clock::create_for_testing(ctx);
    clock::set_for_testing(&mut clock, 1_000);

    payment_request::execute_with_authorization(
        ticket,
        &mut treasury,
        &mut request,
        &clock,
        ctx,
    );

    assert!(payment_request::is_paid(&request));
    assert!(treasury::vendor_committed_balance(&treasury) == 260);
    assert!(treasury::total_paid(&treasury) == 240);

    clock::destroy_for_testing(clock);
    authorization::destroy_verifier_for_testing(verifier_cap);
    payment_request::destroy_for_testing(request);
    treasury::destroy_for_testing(treasury, admin_cap);
}

#[test, expected_failure(abort_code = 5, location = coffer::authorization)]
fun ticket_amount_below_request_is_rejected() {
    let ctx = &mut tx_context::dummy();
    let (mut treasury, admin_cap) = funded_treasury(ctx);
    let mut request = payment_request::create_for_testing_with_digest(
        treasury::id(&treasury),
        VENDOR,
        240,
        treasury::vendor_committed_bucket(),
        1_000,
        5_000,
        1,
        vector[7, 8, 9],
        ctx,
    );
    let verifier_cap = authorization::create_verifier_for_testing(
        treasury::id(&treasury),
        ctx,
    );
    let ticket = authorization::mint_ticket(
        &verifier_cap,
        treasury::id(&treasury),
        payment_request::id(&request),
        VENDOR,
        vector[7, 8, 9],
        200,
        2_000,
        vector[1, 2, 3],
        ctx,
    );
    let mut clock = clock::create_for_testing(ctx);
    clock::set_for_testing(&mut clock, 1_000);

    payment_request::execute_with_authorization(
        ticket,
        &mut treasury,
        &mut request,
        &clock,
        ctx,
    );

    clock::destroy_for_testing(clock);
    authorization::destroy_verifier_for_testing(verifier_cap);
    payment_request::destroy_for_testing(request);
    treasury::destroy_for_testing(treasury, admin_cap);
}

#[test, expected_failure(abort_code = 3, location = coffer::authorization)]
fun ticket_for_another_request_is_rejected() {
    let ctx = &mut tx_context::dummy();
    let (mut treasury, admin_cap, mut request, verifier_cap, clock) =
        authorization_fixture(ctx);
    let other_request = payment_request::create_for_testing_with_digest(
        treasury::id(&treasury),
        VENDOR,
        240,
        treasury::vendor_committed_bucket(),
        1_000,
        5_000,
        1,
        vector[7, 8, 9],
        ctx,
    );
    let ticket = authorization::mint_ticket(
        &verifier_cap,
        treasury::id(&treasury),
        payment_request::id(&other_request),
        VENDOR,
        vector[7, 8, 9],
        240,
        2_000,
        vector[1],
        ctx,
    );

    payment_request::execute_with_authorization(
        ticket,
        &mut treasury,
        &mut request,
        &clock,
        ctx,
    );

    payment_request::destroy_for_testing(other_request);
    cleanup_authorization(treasury, admin_cap, request, verifier_cap, clock);
}

#[test, expected_failure(abort_code = 4, location = coffer::authorization)]
fun ticket_for_another_vendor_is_rejected() {
    let ctx = &mut tx_context::dummy();
    let (mut treasury, admin_cap, mut request, verifier_cap, clock) =
        authorization_fixture(ctx);
    let ticket = authorization::mint_ticket(
        &verifier_cap,
        treasury::id(&treasury),
        payment_request::id(&request),
        @0xBEEF,
        vector[7, 8, 9],
        240,
        2_000,
        vector[1],
        ctx,
    );

    payment_request::execute_with_authorization(
        ticket,
        &mut treasury,
        &mut request,
        &clock,
        ctx,
    );

    cleanup_authorization(treasury, admin_cap, request, verifier_cap, clock);
}

#[test, expected_failure(abort_code = 6, location = coffer::authorization)]
fun ticket_with_another_action_digest_is_rejected() {
    let ctx = &mut tx_context::dummy();
    let (mut treasury, admin_cap, mut request, verifier_cap, clock) =
        authorization_fixture(ctx);
    let ticket = authorization::mint_ticket(
        &verifier_cap,
        treasury::id(&treasury),
        payment_request::id(&request),
        VENDOR,
        vector[9, 9, 9],
        240,
        2_000,
        vector[1],
        ctx,
    );

    payment_request::execute_with_authorization(
        ticket,
        &mut treasury,
        &mut request,
        &clock,
        ctx,
    );

    cleanup_authorization(treasury, admin_cap, request, verifier_cap, clock);
}

#[test, expected_failure(abort_code = 7, location = coffer::authorization)]
fun expired_ticket_is_rejected() {
    let ctx = &mut tx_context::dummy();
    let (mut treasury, admin_cap, mut request, verifier_cap, clock) =
        authorization_fixture(ctx);
    let ticket = authorization::mint_ticket(
        &verifier_cap,
        treasury::id(&treasury),
        payment_request::id(&request),
        VENDOR,
        vector[7, 8, 9],
        240,
        999,
        vector[1],
        ctx,
    );

    payment_request::execute_with_authorization(
        ticket,
        &mut treasury,
        &mut request,
        &clock,
        ctx,
    );

    cleanup_authorization(treasury, admin_cap, request, verifier_cap, clock);
}

#[test, expected_failure(abort_code = 1, location = coffer::authorization)]
fun verifier_cap_for_another_treasury_cannot_mint() {
    let ctx = &mut tx_context::dummy();
    let (treasury, admin_cap) = funded_treasury(ctx);
    let (other_treasury, other_admin_cap) = funded_treasury(ctx);
    let wrong_verifier = authorization::create_verifier_for_testing(
        treasury::id(&other_treasury),
        ctx,
    );
    let request = payment_request::create_for_testing_with_digest(
        treasury::id(&treasury),
        VENDOR,
        240,
        treasury::vendor_committed_bucket(),
        1_000,
        5_000,
        1,
        vector[7, 8, 9],
        ctx,
    );

    let ticket = authorization::mint_ticket(
        &wrong_verifier,
        treasury::id(&treasury),
        payment_request::id(&request),
        VENDOR,
        vector[7, 8, 9],
        240,
        2_000,
        vector[1],
        ctx,
    );

    authorization::destroy_ticket_for_testing(ticket);
    authorization::destroy_verifier_for_testing(wrong_verifier);
    payment_request::destroy_for_testing(request);
    treasury::destroy_for_testing(other_treasury, other_admin_cap);
    treasury::destroy_for_testing(treasury, admin_cap);
}

fun authorization_fixture(ctx: &mut TxContext): (
    Treasury<TEST_COIN>,
    TreasuryAdminCap,
    PaymentRequest,
    WorldVerifierCap,
    Clock,
) {
    let (treasury, admin_cap) = funded_treasury(ctx);
    let request = payment_request::create_for_testing_with_digest(
        treasury::id(&treasury),
        VENDOR,
        240,
        treasury::vendor_committed_bucket(),
        1_000,
        5_000,
        1,
        vector[7, 8, 9],
        ctx,
    );
    let verifier_cap = authorization::create_verifier_for_testing(
        treasury::id(&treasury),
        ctx,
    );
    let mut clock = clock::create_for_testing(ctx);
    clock::set_for_testing(&mut clock, 1_000);
    (treasury, admin_cap, request, verifier_cap, clock)
}

fun cleanup_authorization(
    treasury: Treasury<TEST_COIN>,
    admin_cap: TreasuryAdminCap,
    request: PaymentRequest,
    verifier_cap: WorldVerifierCap,
    clock: Clock,
) {
    clock::destroy_for_testing(clock);
    authorization::destroy_verifier_for_testing(verifier_cap);
    payment_request::destroy_for_testing(request);
    treasury::destroy_for_testing(treasury, admin_cap);
}

fun funded_treasury(ctx: &mut TxContext): (
    treasury::Treasury<TEST_COIN>,
    treasury::TreasuryAdminCap,
) {
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
        500,
    );
    (treasury, admin_cap)
}
