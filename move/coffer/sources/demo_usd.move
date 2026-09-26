module coffer::demo_usd;

use sui::coin;

public struct DEMO_USD has drop {}

#[allow(deprecated_usage)]
fun init(witness: DEMO_USD, ctx: &mut TxContext) {
    let (treasury_cap, metadata) = coin::create_currency(
        witness,
        6,
        b"DUSD",
        b"Demo USD",
        b"Hackathon-only stable-value test asset for Coffer",
        option::none(),
        ctx,
    );
    transfer::public_freeze_object(metadata);
    transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
}
