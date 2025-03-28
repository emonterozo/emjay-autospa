import { ApiProperty } from '@nestjs/swagger';

class ErrorDetail {
  @ApiProperty({ example: 'field_name' })
  field: string;

  @ApiProperty({ example: 'This field is required' })
  message: string;
}

export class ErrorResponse {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ type: [ErrorDetail] })
  errors: ErrorDetail[];

  constructor(statusCode: number, errors: ErrorDetail[]) {
    this.success = false;
    this.statusCode = statusCode;
    this.errors = errors;
  }
}
