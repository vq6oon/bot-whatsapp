export function scheduleReconnect({ reason, loggedOutReason, restart, logger, setTimer = setTimeout }) {
  if (reason === loggedOutReason) {
    logger.error("WhatsApp logged out; pairing/auth session was rejected. Restart only after checking pairing status.");
    return false;
  }

  logger.error("WhatsApp connection closed (reason:", reason ?? "unknown", "); reconnecting in 2 seconds.");
  setTimer(async () => {
    try {
      await restart();
    } catch (error) {
      logger.error("WhatsApp reconnect failed:", error?.message || error);
    }
  }, 2000);
  return true;
}
