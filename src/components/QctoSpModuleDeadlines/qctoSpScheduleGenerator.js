/** 35-day QCTO SP schedule: blocks sized by module credits, KM then PM per block. */

export const SP_SCHEDULE_TOTAL_DAYS = 35;

function parseCredits(courseName) {
  const match = String(courseName || "").match(/Credits\s+(\d+)/i);
  return match ? parseInt(match[1], 10) : 1;
}

function buildBlocks(rows) {
  const blocks = [];
  let index = 0;
  while (index < rows.length) {
    const row = rows[index];
    if (row.courseType === "QCTO-KM") {
      const block = { km: row, pm: null };
      if (index + 1 < rows.length && rows[index + 1].courseType === "QCTO-PM") {
        block.pm = rows[index + 1];
        index += 2;
      } else {
        index += 1;
      }
      blocks.push(block);
    } else if (row.courseType === "QCTO-PM") {
      blocks.push({ km: null, pm: row });
      index += 1;
    } else {
      index += 1;
    }
  }
  return blocks;
}

function distributeBlockDays(blocks, totalDays) {
  const credits = blocks.map((block) => {
    let sum = 0;
    if (block.km) sum += parseCredits(block.km.courseName);
    if (block.pm) sum += parseCredits(block.pm.courseName);
    return Math.max(sum, 1);
  });
  const creditTotal = credits.reduce((acc, value) => acc + value, 0);
  const days = credits.map((credit) =>
    Math.max(1, Math.round((credit / creditTotal) * totalDays))
  );

  let sum = days.reduce((acc, value) => acc + value, 0);
  while (sum > totalDays) {
    const idx = days.indexOf(Math.max(...days));
    days[idx] -= 1;
    sum -= 1;
  }
  while (sum < totalDays) {
    const idx = days.indexOf(Math.min(...days));
    days[idx] += 1;
    sum += 1;
  }
  return days;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, offset) {
  const d = startOfDay(date);
  d.setDate(d.getDate() + offset);
  return d;
}

function atTime(date, hours, minutes) {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export function dateToDatetimeLocalValue(date) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function dateInputToIsoStart(dateInput) {
  if (!dateInput) return null;
  const d = startOfDay(new Date(`${dateInput}T00:00:00`));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function isoToDateInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Build form values keyed by courseId from a programme start date.
 * Re-run whenever the start date changes to shift the full 35-day timetable.
 */
export function generateSpModuleDeadlineForm(rows, startDateInput, totalDays = SP_SCHEDULE_TOTAL_DAYS) {
  const start =
    typeof startDateInput === "string" && !startDateInput.includes("T")
      ? startOfDay(new Date(`${startDateInput}T00:00:00`))
      : startOfDay(new Date(startDateInput));

  if (Number.isNaN(start.getTime()) || !rows?.length) {
    return null;
  }

  const blocks = buildBlocks(rows);
  if (!blocks.length) return null;

  const blockDays = distributeBlockDays(blocks, totalDays);
  const formByCourseId = {};
  let dayOffset = 0;

  blocks.forEach((block, blockIndex) => {
    const daysInBlock = blockDays[blockIndex];

    if (block.km) {
      const workbookDay = Math.min(
        daysInBlock,
        Math.max(1, Math.ceil(daysInBlock * 0.4))
      );
      const summativeDay = Math.min(
        daysInBlock,
        Math.max(workbookDay, Math.ceil(daysInBlock * 0.75))
      );

      formByCourseId[block.km.courseId] = {
        learnerWorkbookDue: dateToDatetimeLocalValue(
          atTime(addDays(start, dayOffset + workbookDay - 1), 17, 0)
        ),
        summativeDue: dateToDatetimeLocalValue(
          atTime(addDays(start, dayOffset + summativeDay - 1), 17, 0)
        ),
        pmModuleDue: "",
      };
    }

    if (block.pm) {
      formByCourseId[block.pm.courseId] = {
        learnerWorkbookDue: "",
        summativeDue: "",
        pmModuleDue: dateToDatetimeLocalValue(
          atTime(addDays(start, dayOffset + daysInBlock - 1), 23, 59)
        ),
      };
    }

    dayOffset += daysInBlock;
  });

  return formByCourseId;
}

export function formatScheduleEndDate(startDateInput, totalDays = SP_SCHEDULE_TOTAL_DAYS) {
  const start =
    typeof startDateInput === "string" && !startDateInput.includes("T")
      ? startOfDay(new Date(`${startDateInput}T00:00:00`))
      : startOfDay(new Date(startDateInput));
  if (Number.isNaN(start.getTime())) return "";
  const end = addDays(start, totalDays - 1);
  return end.toLocaleDateString(undefined, { dateStyle: "medium" });
}
