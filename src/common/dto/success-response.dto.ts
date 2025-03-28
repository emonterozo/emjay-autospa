import { ApiProperty } from '@nestjs/swagger';

export class SuccessResponse<T> {
  @ApiProperty({ example: true })
  success?: boolean;

  @ApiProperty({ example: 200, required: false })
  statusCode?: number;

  @ApiProperty()
  data: T;

  constructor(data: T, statusCode: number = 200) {
    this.success = true;
    this.data = data;
    this.statusCode = statusCode;
  }
}
