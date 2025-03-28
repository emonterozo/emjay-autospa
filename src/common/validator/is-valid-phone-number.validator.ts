import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isValidPhoneNumber', async: false })
export class IsValidPhoneNumber implements ValidatorConstraintInterface {
  validate(value: string) {
    return /^09\d{9}$/.test(value);
  }

  defaultMessage() {
    return 'contact_number must be a valid 11-digit Philippine mobile number starting with 09';
  }
}
