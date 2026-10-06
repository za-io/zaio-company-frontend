export function isCoachingKind(log) {
  const kind = log?.signals?.kind || log?.kind;
  return kind === "coaching" || kind === "coaching_redirect";
}

function logId(log) {
  if (!log) return "";
  if (log._id != null) return String(log._id);
  return "";
}

function parentId(log) {
  const replyTo = log?.inReplyTo;
  if (replyTo == null) return "";
  if (typeof replyTo === "object" && replyTo._id != null) return String(replyTo._id);
  return String(replyTo);
}

function parentExternalId(log) {
  return log?.signals?.inReplyToExternalId || "";
}

export function formatCoachingChatMessage(log) {
  const time = log.time || log.occurredAt || log.signals?.sentAt || log.createdAt;
  const messageText = log.messageText || log.text || log.signals?.messageText || log.message || "";
  const sentBy = log.sentBy ?? log.from;
  return {
    ...log,
    time: time ? new Date(time).toISOString() : null,
    direction: log.direction || "outbound",
    sentBy,
    from: sentBy,
    messageText,
    text: messageText,
    kind: log.kind || log.signals?.kind || null,
    stepDeadline: log.stepDeadline || log.signals?.stepDeadline || null,
  };
}

/**
 * Student coaching replies are often stored without signals.kind.
 * Include the Discord reply chain around any coaching / coaching_redirect message.
 */
export function selectCoachingThreadEntries(logs) {
  if (!Array.isArray(logs) || logs.length === 0) return [];

  const coachingSeeds = logs.filter(isCoachingKind);
  if (coachingSeeds.length === 0) return [];

  const byId = new Map();
  const byExternalId = new Map();
  for (const log of logs) {
    const id = logId(log);
    if (id) byId.set(id, log);
    if (log.externalMessageId) byExternalId.set(String(log.externalMessageId), log);
  }

  const included = new Set();
  const queue = [...coachingSeeds];

  while (queue.length) {
    const log = queue.pop();
    const id = logId(log);
    if (!id || included.has(id)) continue;
    included.add(id);

    const parent = parentId(log) ? byId.get(parentId(log)) : null;
    if (parent && !included.has(logId(parent))) queue.push(parent);

    const parentExt = parentExternalId(log);
    if (parentExt && byExternalId.has(parentExt)) {
      const linked = byExternalId.get(parentExt);
      if (!included.has(logId(linked))) queue.push(linked);
    }

    for (const child of logs) {
      const childId = logId(child);
      if (!childId || included.has(childId)) continue;
      if (parentId(child) === id) {
        queue.push(child);
        continue;
      }
      if (log.externalMessageId && parentExternalId(child) === String(log.externalMessageId)) {
        queue.push(child);
      }
    }
  }

  const channelIds = new Set(
    coachingSeeds.map((log) => log.signals?.discordChannelId).filter(Boolean).map(String)
  );
  if (channelIds.size > 0) {
    const firstCoachingMs = Math.min(
      ...coachingSeeds
        .map((log) => new Date(log.createdAt || log.time || 0).getTime())
        .filter(Number.isFinite)
    );
    for (const log of logs) {
      const channelId = log.signals?.discordChannelId;
      if (!channelId || !channelIds.has(String(channelId))) continue;
      const at = new Date(log.createdAt || log.time || 0).getTime();
      if (Number.isFinite(at) && at >= firstCoachingMs) included.add(logId(log));
    }
  }

  return logs
    .filter((log) => included.has(logId(log)))
    .sort((a, b) => {
      const aTime = new Date(a.createdAt || a.time || 0).getTime();
      const bTime = new Date(b.createdAt || b.time || 0).getTime();
      return aTime - bTime;
    })
    .map(formatCoachingChatMessage);
}

export function resolveStudentUserId(user) {
  if (!user) return "";
  if (typeof user === "string") return user;
  if (user._id != null) return String(user._id);
  if (user.id != null) return String(user.id);
  return "";
}
