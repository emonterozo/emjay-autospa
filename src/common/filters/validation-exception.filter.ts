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

    // Recursive extractor function
    function extractErrors(
      validationErrors: ValidationError[],
      parentPath: string = '',
    ) {
      for (const error of validationErrors) {
        const fieldPath = parentPath
          ? `${parentPath}.${error.property}`
          : error.property;

        if (error.constraints) {
          for (const msg of Object.values(error.constraints)) {
            errors.push({
              field: fieldPath,
              message: msg,
            });
          }
        }

        if (error.children && error.children.length > 0) {
          extractErrors(error.children, fieldPath);
        }
      }
    }

    // Handle validation errors from ValidationPipe
    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse['message'] instanceof Array
    ) {
      extractErrors(exceptionResponse['message'] as ValidationError[]);
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
