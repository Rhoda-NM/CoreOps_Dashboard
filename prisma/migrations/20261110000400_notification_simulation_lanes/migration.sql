-- AlterTable
ALTER TABLE "NotificationControl" ADD COLUMN     "simulationLaneCursor" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "NotificationControl" ADD CHECK ("simulationLaneCursor">=0);
ALTER TABLE "NotificationOutbox" ADD CHECK (NOT simulated OR ("providerScope" LIKE 'simulation:%' AND "captureAttempts"=0 AND "captureId" IS NULL));
CREATE FUNCTION notification_simulation_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND ROW(OLD."sourceId",OLD."noticeId",OLD."recipientUserId",OLD."logicalKey",OLD.generation,OLD."replacesId",OLD."replacementAuditId",OLD."providerKey",OLD.kind,OLD.channel,OLD."createdAt",OLD."scheduledAt",OLD."latestSendAt",OLD.priority,OLD."recipientPolicyVersion") IS DISTINCT FROM ROW(NEW."sourceId",NEW."noticeId",NEW."recipientUserId",NEW."logicalKey",NEW.generation,NEW."replacesId",NEW."replacementAuditId",NEW."providerKey",NEW.kind,NEW.channel,NEW."createdAt",NEW."scheduledAt",NEW."latestSendAt",NEW.priority,NEW."recipientPolicyVersion") THEN RAISE EXCEPTION 'Immutable logical notification'; END IF;
 IF NEW.simulated AND ((NEW."dispatchedAttempts">0 AND NEW."payloadHash" IS NULL) OR (NEW."providerMessageId" IS NOT NULL AND NEW."providerMessageId"!~'^sim_[a-f0-9]{40}$')) THEN RAISE EXCEPTION 'Invalid simulated dispatch evidence'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER notification_simulation_identity_guard BEFORE INSERT OR UPDATE ON "NotificationOutbox" FOR EACH ROW EXECUTE FUNCTION notification_simulation_identity();
CREATE FUNCTION notification_attempt_simulation_scope() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW.mode='SIMULATED' AND NOT EXISTS(SELECT 1 FROM "NotificationOutbox" o WHERE o.id=NEW."notificationId" AND o.simulated)) OR (NEW.mode='CAPTURE' AND EXISTS(SELECT 1 FROM "NotificationOutbox" o WHERE o.id=NEW."notificationId" AND o.simulated)) THEN RAISE EXCEPTION 'Attempt mode mismatch'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER notification_attempt_sim_scope BEFORE INSERT ON "NotificationDeliveryAttempt" FOR EACH ROW EXECUTE FUNCTION notification_attempt_simulation_scope();
