export function isProjectAssignment(title) {
  if (!title || typeof title !== "string") return false;
  const lower = title.toLowerCase();
  return (
    lower.includes("cstn") ||
    lower.includes("capstone") ||
    lower.includes("cap stone") ||
    /\bcap\b/.test(lower) ||
    lower.includes("final project") ||
    /\bfinal\b/.test(lower)
  );
}

export function calculateModuleMarkFromPercentages(
  mcqPercent,
  challengePercent,
  hasMcq,
  hasChallenge
) {
  if (!hasMcq && !hasChallenge) return 100;
  if (hasMcq && !hasChallenge) return parseFloat(Math.min(100, mcqPercent).toFixed(2));
  if (!hasMcq && hasChallenge) return parseFloat(Math.min(100, challengePercent).toFixed(2));
  return parseFloat((mcqPercent * 0.4 + challengePercent * 0.6).toFixed(2));
}

function calculateAverage(marks) {
  if (!marks || marks.total === 0) return 0;
  return (marks.marks / marks.total) * 100;
}

export function getLetterGrade(percentage) {
  const pct = Number(percentage) || 0;
  if (pct >= 90) return "A+";
  if (pct >= 85) return "A";
  if (pct >= 80) return "A-";
  if (pct >= 75) return "B+";
  if (pct >= 70) return "B";
  if (pct >= 65) return "B-";
  if (pct >= 60) return "C+";
  if (pct >= 55) return "C";
  if (pct >= 50) return "C-";
  return "F";
}

export function getGradeColor(percentage) {
  const pct = Number(percentage) || 0;
  if (pct >= 80) return "#22c55e";
  if (pct >= 65) return "#eab308";
  if (pct >= 50) return "#f97316";
  return "#ef4444";
}

function moduleHasActivity(course) {
  return (course?.completed?.mcq || 0) > 0 || (course?.completed?.challenge || 0) > 0;
}

function moduleHasAssessments(course) {
  return (course?.total?.mcq || 0) > 0 || (course?.total?.challenge || 0) > 0;
}

function getPerformanceBasedModuleMark(course) {
  const mcqTotal = course?.total?.mcq || 0;
  const mcqCompleted = course?.completed?.mcq || 0;
  const challengeTotal = course?.total?.challenge || 0;
  const challengeCompleted = course?.completed?.challenge || 0;

  const mcqMarksTotal = course?.averageMarks?.mcq?.total ?? 0;
  const mcqMarksGot = course?.averageMarks?.mcq?.marks ?? 0;
  const challengeMarksTotal = course?.averageMarks?.challenge?.total ?? 0;
  const challengeMarksGot = course?.averageMarks?.challenge?.marks ?? 0;

  let mcqPct = 0;
  if (mcqMarksTotal > 0 && mcqTotal > 0) {
    const completedWeight = mcqMarksTotal * (mcqCompleted / mcqTotal);
    const avgOnCompleted = completedWeight > 0 ? (mcqMarksGot / completedWeight) * 100 : 0;
    const remainingWeight = Math.max(0, mcqMarksTotal - completedWeight);
    const projectedGot = mcqMarksGot + remainingWeight * (avgOnCompleted / 100);
    mcqPct = (projectedGot / mcqMarksTotal) * 100;
  }

  let challengePct = 0;
  if (challengeMarksTotal > 0 && challengeTotal > 0) {
    const completedWeight = challengeMarksTotal * (challengeCompleted / challengeTotal);
    const passRate = completedWeight > 0 ? challengeMarksGot / completedWeight : 0;
    const remainingWeight = Math.max(0, challengeMarksTotal - completedWeight);
    const projectedGot = challengeMarksGot + remainingWeight * passRate;
    challengePct = (projectedGot / challengeMarksTotal) * 100;
  }

  return calculateModuleMarkFromPercentages(
    mcqPct,
    challengePct,
    mcqTotal > 0,
    challengeTotal > 0
  );
}

function getPredictedModuleDetails(courses) {
  const activeMarks = courses
    .filter(moduleHasActivity)
    .map(getPerformanceBasedModuleMark);

  const avgActiveMark =
    activeMarks.length > 0
      ? activeMarks.reduce((sum, mark) => sum + mark, 0) / activeMarks.length
      : 0;

  return courses.map((course) => {
    const name = course.coursename || "Module";
    let mark;
    let source;

    if (moduleHasActivity(course)) {
      mark = getPerformanceBasedModuleMark(course);
      source = "your_performance";
    } else if (!moduleHasAssessments(course)) {
      mark = 100;
      source = "no_assessments";
    } else {
      mark = avgActiveMark;
      source = "estimated_from_average";
    }

    return {
      name,
      mark: Number(mark.toFixed(2)),
      source,
      started: moduleHasActivity(course),
    };
  });
}

function calculateFinalModuleMark(moduleMarks, assignmentAvg) {
  if (!moduleMarks?.length) return 0;
  const avgModuleMarks = moduleMarks.reduce((sum, mark) => sum + mark, 0) / moduleMarks.length;
  const finalModuleMark = avgModuleMarks * 0.5 + (Number(assignmentAvg) || 0) * 0.5;
  return Math.min(100, Number(finalModuleMark.toFixed(2)));
}

function getRegularAssignments(academicInfo) {
  return (academicInfo?.allAssignments || []).filter(
    (a) => !isProjectAssignment(a.title || a.name)
  );
}

function getPredictedAssignmentDetails(academicInfo) {
  const regular = getRegularAssignments(academicInfo);
  if (!regular.length) {
    const fallback = Number(academicInfo?.overallAssignmentAvg) || 0;
    return {
      avg: fallback,
      gradedCount: 0,
      ungradedCount: 0,
      avgOnGraded: 0,
      gradedMarks: [],
      totalCount: 0,
    };
  }

  const gradedMarks = [];
  let ungradedCount = 0;
  for (const assignment of regular) {
    if (assignment.mark != null && !Number.isNaN(Number(assignment.mark))) {
      gradedMarks.push(Number(assignment.mark));
    } else {
      ungradedCount += 1;
    }
  }

  if (gradedMarks.length === 0) {
    return {
      avg: 0,
      gradedCount: 0,
      ungradedCount: regular.length,
      avgOnGraded: 0,
      gradedMarks: [],
      totalCount: regular.length,
    };
  }

  const avgOnGraded =
    gradedMarks.reduce((sum, mark) => sum + mark, 0) / gradedMarks.length;
  const totalMarks =
    gradedMarks.reduce((sum, mark) => sum + mark, 0) + ungradedCount * avgOnGraded;
  const avg = Number((totalMarks / regular.length).toFixed(2));

  return {
    avg,
    gradedCount: gradedMarks.length,
    ungradedCount,
    avgOnGraded: Number(avgOnGraded.toFixed(2)),
    gradedMarks,
    totalCount: regular.length,
  };
}

function getPredictedProjectMark(academicInfo, courses, avgModuleMark, predictedAssignmentAvg) {
  const graded =
    Number(academicInfo?.finalProjectMark ?? courses?.[0]?.finalprojectmark ?? 0) || 0;
  if (graded > 0) {
    return { mark: graded, source: "graded" };
  }
  if (predictedAssignmentAvg > 0) {
    return { mark: predictedAssignmentAvg, source: "estimated_from_assignments" };
  }
  return { mark: avgModuleMark, source: "estimated_from_modules" };
}

function sumAssessmentCounts(courses, key) {
  return courses.reduce(
    (acc, course) => {
      acc.completed += course?.completed?.[key] || 0;
      acc.total += course?.total?.[key] || 0;
      return acc;
    },
    { completed: 0, total: 0 }
  );
}

export function buildTranscriptDataFromTutorSummary(
  userSummary,
  allAssignments,
  finalProjectMark
) {
  const regular = (allAssignments || []).filter(
    (a) => !isProjectAssignment(a.title || a.name)
  );
  let overallAssignmentAvg = 0;
  if (regular.length > 0) {
    overallAssignmentAvg =
      regular.reduce(
        (acc, a) => acc + (a.mark != null && !Number.isNaN(Number(a.mark)) ? Number(a.mark) : 0),
        0
      ) / regular.length;
  } else if (userSummary?.length) {
    overallAssignmentAvg =
      userSummary.reduce((acc, m) => acc + parseFloat(m?.assignmentAvg || 0), 0) /
      userSummary.length;
  }

  return {
    data: userSummary || [],
    academicInfo: {
      allAssignments: allAssignments || [],
      finalProjectMark: Number(finalProjectMark) || 0,
      overallAssignmentAvg: Number(overallAssignmentAvg.toFixed(2)),
    },
  };
}

export function calculateFinalMarkProjection(transcriptData) {
  const courses = transcriptData?.data || [];
  const academicInfo = transcriptData?.academicInfo || {};

  if (!courses.length) {
    return null;
  }

  const moduleDetails = getPredictedModuleDetails(courses);
  const predictedModuleMarks = moduleDetails.map((module) => module.mark);
  const avgModuleMark =
    predictedModuleMarks.reduce((sum, mark) => sum + mark, 0) / predictedModuleMarks.length;
  const assignmentDetails = getPredictedAssignmentDetails(academicInfo);
  const predictedAssignmentAvg = assignmentDetails.avg;
  const predictedFinalModuleMark = calculateFinalModuleMark(
    predictedModuleMarks,
    predictedAssignmentAvg
  );
  const projectDetails = getPredictedProjectMark(
    academicInfo,
    courses,
    avgModuleMark,
    predictedAssignmentAvg
  );
  const predictedProjectMark = projectDetails.mark;

  const finalMarkExact = predictedFinalModuleMark * 0.6 + predictedProjectMark * 0.4;
  const predictedFinalMark = Math.min(100, Math.round(finalMarkExact));

  const mcq = sumAssessmentCounts(courses, "mcq");
  const challenges = sumAssessmentCounts(courses, "challenge");
  const regularAssignments = getRegularAssignments(academicInfo);
  const assignmentsGraded = regularAssignments.filter(
    (a) => a.mark != null && !Number.isNaN(Number(a.mark))
  ).length;
  const modulesStarted = courses.filter(moduleHasActivity).length;

  return {
    predicted: {
      finalMark: predictedFinalMark,
      finalModuleMark: predictedFinalModuleMark,
      projectMark: predictedProjectMark,
      assignmentAvg: predictedAssignmentAvg,
      avgModuleMark: Number(avgModuleMark.toFixed(2)),
      letterGrade: getLetterGrade(predictedFinalMark),
    },
    components: {
      mcq,
      challenges,
      assignments: {
        graded: assignmentsGraded,
        total: regularAssignments.length,
      },
      modules: {
        started: modulesStarted,
        total: courses.length,
      },
      projectGraded:
        Number(academicInfo?.finalProjectMark ?? courses?.[0]?.finalprojectmark ?? 0) > 0,
    },
    calculation: {
      modules: moduleDetails,
      avgPlatformMark: Number(avgModuleMark.toFixed(2)),
      assignment: assignmentDetails,
      finalModuleMark: predictedFinalModuleMark,
      project: projectDetails,
      finalMarkExact: Number(finalMarkExact.toFixed(2)),
      steps: {
        platformAverage: `(sum of ${moduleDetails.length} module marks) ÷ ${moduleDetails.length} = ${Number(avgModuleMark.toFixed(2))}%`,
        finalModuleMark: `(${Number(avgModuleMark.toFixed(2))}% × 50%) + (${predictedAssignmentAvg}% × 50%) = ${predictedFinalModuleMark}%`,
        finalMark: `(${predictedFinalModuleMark}% × 60%) + (${Number(predictedProjectMark.toFixed(2))}% × 40%) = ${Number(finalMarkExact.toFixed(2))}% → ${predictedFinalMark}%`,
      },
    },
  };
}
