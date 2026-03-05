import firebase_admin
from firebase_admin import firestore

db = firestore.client()

async def resolve_bets(matchId: str, winner: str):
    # Get all pending bets for this match
    bets = db.collection("bets") \
             .where("matchId", "==", matchId) \
             .where("status", "==", "pending") \
             .stream()

    resolved = []

    for bet_doc in bets:
        bet = bet_doc.to_dict()
        won = bet["betOn"] == winner

        # Update bet status
        bet_doc.reference.update({
            "status": "won" if won else "lost"
        })

        # Update user coins
        user_ref = db.collection("users").document(bet["userId"])
        user = user_ref.get().to_dict()

        if won:
            # Winner gets double their bet back
            user_ref.update({"coins": user["coins"] + bet["amount"] * 2})
        else:
            # Loser loses their bet amount
            user_ref.update({"coins": user["coins"] - bet["amount"]})

        resolved.append(bet)

    return resolved
