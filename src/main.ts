import { NestFactory } from '@nestjs/core';
import { BadRequestException, ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module';
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Automatically transform types
      exceptionFactory: (errors) => new BadRequestException(errors), // Pass raw errors to filter
    }),
  );

  // Use custom validation exception filter globally
  app.useGlobalFilters(new ValidationExceptionFilter());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
