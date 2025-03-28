import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { Response } from 'express';

interface ValidationErrorResponse {
  field: string;
  message: string;
}

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errors: ValidationErrorResponse[] = [];

    // Check if the exception response contains validation errors
    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse['message'] instanceof Array
    ) {
      exceptionResponse['message'].forEach((error: ValidationError) => {
        const fieldErrors = Object.values(error.constraints ?? {});

        fieldErrors.forEach((errorMessage) => {
          errors.push({ field: error.property, message: errorMessage });
        });
      });

      response.status(status).json({
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        errors,
      });
    } else {
      response.status(status).json(exceptionResponse);
    }
  }
}
