"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentStatus = exports.UserRole = exports.DocumentStatus = exports.ApplicationStatus = exports.VisaType = exports.Language = void 0;
var Language;
(function (Language) {
    Language["EN"] = "en";
    Language["FR"] = "fr";
    Language["HT"] = "ht";
})(Language || (exports.Language = Language = {}));
var VisaType;
(function (VisaType) {
    VisaType["VITEM_XI"] = "VITEM_XI";
    VisaType["VITEM_III"] = "VITEM_III";
})(VisaType || (exports.VisaType = VisaType = {}));
var ApplicationStatus;
(function (ApplicationStatus) {
    ApplicationStatus["NOT_STARTED"] = "NOT_STARTED";
    ApplicationStatus["PENDING_DOCUMENTS"] = "PENDING_DOCUMENTS";
    ApplicationStatus["IN_REVIEW"] = "IN_REVIEW";
    ApplicationStatus["APPOINTMENT_SCHEDULED"] = "APPOINTMENT_SCHEDULED";
    ApplicationStatus["APPROVED"] = "APPROVED";
    ApplicationStatus["REJECTED"] = "REJECTED";
})(ApplicationStatus || (exports.ApplicationStatus = ApplicationStatus = {}));
var DocumentStatus;
(function (DocumentStatus) {
    DocumentStatus["MISSING"] = "MISSING";
    DocumentStatus["UPLOADED"] = "UPLOADED";
    DocumentStatus["VERIFIED"] = "VERIFIED";
    DocumentStatus["REJECTED"] = "REJECTED";
})(DocumentStatus || (exports.DocumentStatus = DocumentStatus = {}));
var UserRole;
(function (UserRole) {
    UserRole["APPLICANT"] = "applicant";
    UserRole["ADMIN"] = "admin";
})(UserRole || (exports.UserRole = UserRole = {}));
var AppointmentStatus;
(function (AppointmentStatus) {
    AppointmentStatus["BOOKED"] = "BOOKED";
    AppointmentStatus["CONFIRMED"] = "CONFIRMED";
    AppointmentStatus["COMPLETED"] = "COMPLETED";
    AppointmentStatus["CANCELLED"] = "CANCELLED";
})(AppointmentStatus || (exports.AppointmentStatus = AppointmentStatus = {}));
