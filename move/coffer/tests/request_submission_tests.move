#[test_only]
module coffer::request_submission_tests;

use coffer::payment_request;
use coffer::treasury;
use coffer::vendor_registry;

const VENDOR: address = @0x0;

public struct TEST_COIN has drop {}

#[test]
fun vendor_cap_submits_a_request_with_encrypted_document_commitments() {
    let ctx = &mut tx_context::dummy();
    let (treasury, admin_cap) = treasury::create_for_testing<TEST_COIN>(ctx);
    let (policy, vendor_cap) = vendor_registry::create_registration_for_testing(
        treasury::id(&treasury),
        VENDOR,
        true,
        500,
        treasury::vendor_committed_bucket(),
        10_000,
        ctx,
    );
    let seal_policy_id = treasury::id(&treasury);
    let request = payment_request::submit_for_testing(
        &vendor_cap,
        &policy,
        &treasury,
        240,
        treasury::vendor_committed_bucket(),
        1_000,
        5_000,
        1,
        vector[1, 2, 3],
        std::string::utf8(b"walrus-blob-id"),
        seal_policy_id,
        vector[7, 8, 9],
        ctx,
    );

    assert!(payment_request::requester(&request) == VENDOR);
    assert!(payment_request::invoice_digest(&request) == &vector[1, 2, 3]);
    assert!(payment_request::walrus_blob_id(&request) == &std::string::utf8(b"walrus-blob-id"));
    assert!(payment_request::seal_policy_id(&request) == seal_policy_id);

    payment_request::destroy_for_testing(request);
    vendor_registry::destroy_registration_for_testing(policy, vendor_cap);
    treasury::destroy_for_testing(treasury, admin_cap);
}

#[test]
fun vendor_binds_world_action_after_request_id_exists() {
    let ctx = &mut tx_context::dummy();
    let (treasury, admin_cap) = treasury::create_for_testing<TEST_COIN>(ctx);
    let (policy, vendor_cap) = vendor_registry::create_registration_for_testing(
        treasury::id(&treasury),
        VENDOR,
        true,
        500,
        treasury::vendor_committed_bucket(),
        10_000,
        ctx,
    );
    let mut request = payment_request::submit_for_testing(
        &vendor_cap,
        &policy,
        &treasury,
        240,
        treasury::vendor_committed_bucket(),
        1_000,
        5_000,
        1,
        vector[1, 2, 3],
        std::string::utf8(b"walrus-blob-id"),
        treasury::id(&treasury),
        vector[],
        ctx,
    );
    let digest = vector[
        7, 7, 7, 7, 7, 7, 7, 7,
        7, 7, 7, 7, 7, 7, 7, 7,
        7, 7, 7, 7, 7, 7, 7, 7,
        7, 7, 7, 7, 7, 7, 7, 7,
    ];

    payment_request::bind_world_action(
        &vendor_cap,
        &policy,
        &mut request,
        digest,
        ctx,
    );

    assert!(payment_request::action_digest(&request).length() == 32);
    payment_request::destroy_for_testing(request);
    vendor_registry::destroy_registration_for_testing(policy, vendor_cap);
    treasury::destroy_for_testing(treasury, admin_cap);
}

#[test, expected_failure(abort_code = 6, location = coffer::payment_request)]
fun world_action_digest_cannot_be_rebound() {
    let ctx = &mut tx_context::dummy();
    let (treasury, admin_cap) = treasury::create_for_testing<TEST_COIN>(ctx);
    let (policy, vendor_cap) = vendor_registry::create_registration_for_testing(
        treasury::id(&treasury),
        VENDOR,
        true,
        500,
        treasury::vendor_committed_bucket(),
        10_000,
        ctx,
    );
    let digest = vector[
        7, 7, 7, 7, 7, 7, 7, 7,
        7, 7, 7, 7, 7, 7, 7, 7,
        7, 7, 7, 7, 7, 7, 7, 7,
        7, 7, 7, 7, 7, 7, 7, 7,
    ];
    let mut request = payment_request::submit_for_testing(
        &vendor_cap,
        &policy,
        &treasury,
        240,
        treasury::vendor_committed_bucket(),
        1_000,
        5_000,
        1,
        vector[1],
        std::string::utf8(b"blob"),
        treasury::id(&treasury),
        vector[],
        ctx,
    );

    payment_request::bind_world_action(
        &vendor_cap, &policy, &mut request, digest, ctx,
    );
    payment_request::bind_world_action(
        &vendor_cap,
        &policy,
        &mut request,
        vector[
            8, 8, 8, 8, 8, 8, 8, 8,
            8, 8, 8, 8, 8, 8, 8, 8,
            8, 8, 8, 8, 8, 8, 8, 8,
            8, 8, 8, 8, 8, 8, 8, 8,
        ],
        ctx,
    );

    payment_request::destroy_for_testing(request);
    vendor_registry::destroy_registration_for_testing(policy, vendor_cap);
    treasury::destroy_for_testing(treasury, admin_cap);
}

#[test, expected_failure(abort_code = 7, location = coffer::vendor_registry)]
fun vendor_cap_for_another_policy_is_rejected() {
    let ctx = &mut tx_context::dummy();
    let (treasury, admin_cap) = treasury::create_for_testing<TEST_COIN>(ctx);
    let (policy, vendor_cap) = vendor_registry::create_registration_for_testing(
        treasury::id(&treasury),
        VENDOR,
        true,
        500,
        treasury::vendor_committed_bucket(),
        10_000,
        ctx,
    );
    let (other_policy, other_cap) = vendor_registry::create_registration_for_testing(
        treasury::id(&treasury),
        VENDOR,
        true,
        500,
        treasury::vendor_committed_bucket(),
        10_000,
        ctx,
    );

    let request = payment_request::submit_for_testing(
        &vendor_cap,
        &other_policy,
        &treasury,
        80,
        treasury::vendor_committed_bucket(),
        1_000,
        5_000,
        1,
        vector[1],
        std::string::utf8(b"blob"),
        treasury::id(&treasury),
        vector[2],
        ctx,
    );

    payment_request::destroy_for_testing(request);
    vendor_registry::destroy_registration_for_testing(policy, vendor_cap);
    vendor_registry::destroy_registration_for_testing(other_policy, other_cap);
    treasury::destroy_for_testing(treasury, admin_cap);
}
