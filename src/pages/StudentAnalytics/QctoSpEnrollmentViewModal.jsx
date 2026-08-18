import React from "react";
import { FiX } from "react-icons/fi";
import { formatDate } from "../../utils/dateUtils";

const ENROLLMENT_SECTIONS = [
  {
    title: "Accreditation & Identity",
    fields: [
      ["sdpAccreditationNumber", "SDP Accreditation Number"],
      ["nationalId", "National ID"],
      ["learnerAlternateId", "Learner Alternate ID"],
      ["alternateIdType", "Alternate ID Type"],
    ],
  },
  {
    title: "Personal Details",
    fields: [
      ["learnerLastName", "Learner Last Name"],
      ["learnerFirstName", "Learner First Name"],
      ["learnerMiddleName", "Learner Middle Name"],
      ["learnerTitle", "Learner Title"],
      ["learnerBirthDate", "Learner Birth Date"],
    ],
  },
  {
    title: "Demographics",
    fields: [
      ["equityCode", "Equity Code"],
      ["nationalityCode", "Nationality Code"],
      ["homeLanguageCode", "Home Language Code"],
      ["genderCode", "Gender Code"],
      ["citizenStatusCode", "Citizen Status Code"],
      ["socioeconomicCode", "Socioeconomic Code"],
      ["disabilityCode", "Disability Code"],
      ["disabilityRating", "Disability Rating"],
      ["immigrantStatus", "Immigrant Status"],
    ],
  },
  {
    title: "Home Address",
    fields: [
      ["homeAddress1", "Home Address 1"],
      ["homeAddress2", "Home Address 2"],
      ["homeAddress3", "Home Address 3"],
    ],
  },
  {
    title: "Postal Address & Codes",
    fields: [
      ["postalAddress1", "Postal Address 1"],
      ["postalAddress2", "Postal Address 2"],
      ["postalAddress3", "Postal Address 3"],
      ["learnerHomeAddressPostalCode", "Home Address Postal Code"],
      ["learnerHomeAddressPhysicalCode", "Home Address Physical Code"],
    ],
  },
  {
    title: "Contact",
    fields: [
      ["learnerPhoneNumber", "Phone Number"],
      ["learnerCellPhoneNumber", "Cell Phone Number"],
      ["learnerFaxNumber", "Fax Number"],
      ["learnerEmailAddress", "Email Address"],
    ],
  },
  {
    title: "Location",
    fields: [
      ["provinceCode", "Province Code"],
      ["statssaAreaCode", "STATSSA Area Code"],
    ],
  },
  {
    title: "POPI Act",
    fields: [
      ["popiActAgree", "POPI Act Agree"],
      ["popiActDate", "POPI Act Date"],
    ],
  },
  {
    title: "Programme",
    fields: [
      ["skillsProgrammeId", "Skills Programme ID"],
      ["employmentStatus", "Employment Status"],
      ["learnerEnrolledDate", "Learner Enrolled Date"],
    ],
  },
  {
    title: "Stage 2 (FISA)",
    fields: [
      ["fisaDate", "Date of FISA"],
      ["fisaResult", "Final FISA Result"],
      ["dateSubmittedToQcto", "Date Submitted to QCTO"],
    ],
  },
];

const DATE_FIELDS = new Set([
  "learnerBirthDate",
  "popiActDate",
  "learnerEnrolledDate",
  "fisaDate",
  "dateSubmittedToQcto",
]);

function formatFieldValue(key, value) {
  if (value == null || value === "") return "—";
  if (key === "popiActAgree") {
    return value === true || value === "true" || value === "Y" ? "Yes" : "No";
  }
  if (DATE_FIELDS.has(key)) {
    try {
      return formatDate(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export default function QctoSpEnrollmentViewModal({ row, onClose }) {
  if (!row) return null;

  const student = row.student || {};
  const enrollment = row.enrollment || {};
  const studentName =
    student.username || student.name || [enrollment.learnerFirstName, enrollment.learnerLastName].filter(Boolean).join(" ") || student.email || "Learner";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl border border-gray-700 bg-[#161B22] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-800 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-white">QCTO registration form</h2>
            <p className="text-sm text-gray-400 mt-1">{studentName}</p>
            {student.email && <p className="text-xs text-gray-500">{student.email}</p>}
            {row.isLateEnrollment && (
              <span className="inline-block mt-2 text-xs font-medium text-amber-400">Late registration</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4 space-y-6">
          {!row.registrationComplete || !enrollment || Object.keys(enrollment).length === 0 ? (
            <p className="text-gray-400 py-8 text-center">This learner has not completed QCTO registration yet.</p>
          ) : (
            ENROLLMENT_SECTIONS.map((section) => {
              const visibleFields = section.fields.filter(([key]) => {
                const val = enrollment[key];
                if (section.title === "Stage 2 (FISA)") {
                  return val != null && val !== "";
                }
                return true;
              });
              if (section.title === "Stage 2 (FISA)" && visibleFields.length === 0) {
                return null;
              }
              return (
                <div key={section.title}>
                  <h3 className="text-sm font-semibold text-violet-300 mb-3">{section.title}</h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    {section.fields.map(([key, label]) => (
                      <div key={key} className="min-w-0">
                        <dt className="text-xs text-gray-500 uppercase tracking-wide">{label}</dt>
                        <dd className="text-sm text-gray-200 mt-0.5 break-words">
                          {formatFieldValue(key, enrollment[key])}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-gray-800 px-6 py-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
