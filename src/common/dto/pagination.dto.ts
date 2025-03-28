import { BadRequestException } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ErrorResponse } from './error-response.dto';
import { IsValidDate } from '../decorator/is-valid-date.decorator';
import { isValidDate } from '../utils/date-utils';

export enum OrderDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export class OrderByDto {
  @IsString()
  field: string;

  @IsEnum(OrderDirection)
  direction: OrderDirection;
}

export class DateRangeDto {
  @IsValidDate('start')
  start: Date;

  @IsValidDate('end')
  end: Date;
}

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @Transform(
    ({ value }) => {
      if (typeof value === 'string') {
        try {
          const obj: unknown = JSON.parse(value);

          if (
            obj &&
            typeof obj === 'object' &&
            'field' in obj &&
            'direction' in obj &&
            Object.values(OrderDirection).includes(
              obj.direction as OrderDirection,
            )
          ) {
            return Object.assign(new OrderByDto(), obj); // Ensure it's an instance of OrderByDto
          }

          throw new Error();
        } catch {
          throw new BadRequestException(
            new ErrorResponse(400, [
              {
                field: 'order_by',
                message:
                  'order_by must be a valid JSON object containing field (string) and direction (asc or desc)',
              },
            ]),
          );
        }
      }
      return value as OrderByDto;
    },
    { toClassOnly: true },
  )
  order_by?: OrderByDto;

  @Transform(
    ({ value }) => {
      if (typeof value === 'string') {
        try {
          const obj: unknown = JSON.parse(value);

          if (
            obj &&
            typeof obj === 'object' &&
            'start' in obj &&
            'end' in obj
          ) {
            if (!isValidDate(obj.start as string)) {
              throw new BadRequestException(
                new ErrorResponse(400, [
                  {
                    field: 'date_range.start',
                    message:
                      'Start date must be a valid date in yyyy-MM-dd format',
                  },
                ]),
              );
            }

            // Validate "end" date
            if (!isValidDate(obj.end as string)) {
              throw new BadRequestException(
                new ErrorResponse(400, [
                  {
                    field: 'date_range.end',
                    message:
                      'End date must be a valid date in yyyy-MM-dd format',
                  },
                ]),
              );
            }

            // Convert start & end to Date objects
            const startDate = new Date(obj.start as string);
            const endDate = new Date(obj.end as string);

            // Ensure end date is set to 23:59:59.999 (midnight)
            endDate.setHours(23, 59, 59, 999);

            return Object.assign(new DateRangeDto(), {
              start: startDate,
              end: endDate,
            });
          }
          throw new Error();
        } catch (error) {
          if (error instanceof BadRequestException) {
            throw error;
          }

          throw new BadRequestException(
            new ErrorResponse(400, [
              {
                field: 'date_range',
                message: `date_range must be a valid JSON object containing start and end dates in the format yyyy-MM-dd`,
              },
            ]),
          );
        }
      }
      return value as DateRangeDto;
    },
    { toClassOnly: true },
  )
  date_range?: DateRangeDto;
}
