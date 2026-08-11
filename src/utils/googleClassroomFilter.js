export function normalizeBootcampId(id) {
  if (id == null) return "";
  return id._id != null ? String(id._id) : String(id);
}

/**
 * Keep only Google Classroom assignment docs for this bootcamp's linked classroom.
 * Never falls back to other bootcamps or unrelated classrooms.
 */
export function filterGoogleClassroomForBootcamp(
  gcDocs,
  bootcampId,
  linkedGoogleClassroomCourseId
) {
  const bootcampIdStr = normalizeBootcampId(bootcampId);
  const linkedCourseId = linkedGoogleClassroomCourseId
    ? String(linkedGoogleClassroomCourseId).trim()
    : "";

  if (!bootcampIdStr) return [];

  return (gcDocs || []).filter((doc) => {
    const docBootcampId = normalizeBootcampId(doc.bootcampId);
    const docCourseId = doc.googleClassroomCourseId
      ? String(doc.googleClassroomCourseId).trim()
      : "";

    if (docBootcampId === bootcampIdStr) {
      if (linkedCourseId && docCourseId && docCourseId !== linkedCourseId) return false;
      return true;
    }

    if (!docBootcampId && linkedCourseId && docCourseId === linkedCourseId) {
      return true;
    }

    return false;
  });
}
