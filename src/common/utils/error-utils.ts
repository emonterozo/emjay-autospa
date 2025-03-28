import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ErrorResponse } from '../dto/error-response.dto';

export function throwInternalServerError() {
  throw new InternalServerErrorException(
    new ErrorResponse(500, [
      { field: 'unknown', message: 'An unexpected error occurred' },
    ]),
  );
}

export function throwNotFoundException(field: string, message: string) {
  throw new NotFoundException(new ErrorResponse(404, [{ field, message }]));
}
