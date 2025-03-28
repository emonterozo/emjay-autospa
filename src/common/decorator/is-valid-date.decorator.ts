import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsValidDate(
  key: string,
  ageLimit?: number,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidDate',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [ageLimit],
      options: validationOptions,
      validator: {
        validate(value: string, args: ValidationArguments) {
          // Ensure value is a string in yyyy-MM-dd format
          if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return false;
          }

          const date = new Date(value);
          if (
            isNaN(date.getTime()) ||
            value !== date.toISOString().split('T')[0]
          ) {
            return false; // Ensure it's a real date
          }

          // Check age limit if provided
          const ageLimit = args.constraints[0] as number;
          if (ageLimit !== undefined) {
            const today = new Date();
            const minBirthDate = new Date(
              today.getFullYear() - ageLimit,
              today.getMonth(),
              today.getDate(),
            );
            if (date > minBirthDate) {
              return false; // User is too young
            }
          }

          return true;
        },

        defaultMessage(args: ValidationArguments) {
          const ageLimit = args.constraints[0] as number;
          if (ageLimit !== undefined) {
            return `${key} must be a valid date in yyyy-MM-dd format and you must be at least ${ageLimit} years old.`;
          }
          return `${key} must be a valid date in yyyy-MM-dd format.`;
        },
      },
    });
  };
}
