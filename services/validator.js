// App ID - exactly 6 digits
function validateAppId(value) {
    if (!value) return false;
    return /^[0-9]{6}$/.test(value);
}

// South African Mobile Number
// Must start with 06, 07, 08, or 09 and total 10 digits
function validateMobile(value) {
    if (!value) return false;
    return /^0[6-9][0-9]{8}$/.test(value);
}

// PIN - exactly 6 digits
function validatePin(value) {
    if (!value) return false;
    return /^[0-9]{6}$/.test(value);
}

const ID_EXP = /^(\d{2})([0-1][0-9])([0-3]\d)(\d{4})([0-2]\d)\d$/;

// Luhn Algorithm Function
function luhn(value) {
    let sum = 0;
    let shouldDouble = false;

    for (let i = value.length - 1; i >= 0; i--) {
        let digit = parseInt(value.charAt(i), 10);

        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }

        sum += digit;
        shouldDouble = !shouldDouble;
    }

    return sum % 10;
}

// Validate ID function
function validateId(value) {
    if (!value || value.length === 0) {
        return null;
    }

    if (value.length !== 13) {
        return { invalid: true };
    }

    if (value.startsWith("7777")) {
        return null;
    }

    if (!ID_EXP.test(value)) {
        return { invalid: true };
    }

    if (luhn(value) !== 0) {
        return { invalid: true };
    }

    return null;
}

module.exports = {
    validateId,
    validateAppId,
    validateMobile,
    validatePin,
};
