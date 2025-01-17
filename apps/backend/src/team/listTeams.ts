import { db, functions, logger } from "../fcm";
import { Team } from "@8hourrelay/models";

export const onListTeams = functions
  .runWith({
    enforceAppCheck: true,
  })
  .https.onCall(async (data, context) => {
    // context.app will be undefined if the request doesn't include an
    // App Check token. (If the request includes an invalid App Check
    // token, the request will be rejected with HTTP error 401.)
    if (context.app == undefined) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "The function must be called from an App Check verified app."
      );
    }
    logger.info(`list teams incoming data`, { data });
    const { race } = data;
    const year = new Date().getFullYear().toString();
    const teamsRef = await db
      .collection("Race")
      .doc(year)
      .collection("Teams")
      .where("state", "==", "APPROVED")
      .get();
    if (teamsRef.size > 0) {
      const teams = teamsRef.docs.map((data) => {
        const d = data.data();
        const team = { ...d, id: data.id, password: "" };
        return team as Team;
      });
      const validTeams = teams.filter(
        (f) => f.isOpen && f.state === "APPROVED"
      );
      if (race) return validTeams.filter((f) => f?.race === race);
      return validTeams;
    }

    return null;
  });
