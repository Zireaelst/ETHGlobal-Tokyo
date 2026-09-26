module coffer::demo_usd;

use coffer::treasury::{Self, Treasury};
use sui::coin::{Self, TreasuryCap};

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

/// Testnet demo funding only. `DEMO_USD` has no external value and this
/// function deliberately requires the unique currency treasury capability.
public fun mint_and_deposit(
    cap: &mut TreasuryCap<DEMO_USD>,
    target: &mut Treasury<DEMO_USD>,
    amount: u64,
    ctx: &mut TxContext,
) {
    let funds = coin::mint(cap, amount, ctx);
    treasury::deposit_operating(target, funds);
}
