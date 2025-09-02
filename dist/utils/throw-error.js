"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.is_operational_error = exports.throw_error = exports.TAppError = void 0;
class TAppError extends Error {
    constructor(message, status_code = 500, is_operational = true) {
        super(message);
        this.status_code = status_code;
        this.is_operational = is_operational;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.TAppError = TAppError;
const throw_error = ({ message, status_code = 500 }) => {
    throw new TAppError(message, status_code);
};
exports.throw_error = throw_error;
const is_operational_error = (error) => {
    if (error instanceof TAppError) {
        return error.is_operational;
    }
    return false;
};
exports.is_operational_error = is_operational_error;
