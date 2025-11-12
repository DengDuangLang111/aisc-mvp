import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'BAD_REQUEST' })
  code: string;

  @ApiProperty({ example: 'Invalid request parameters' })
  message: string;

  @ApiProperty({ required: false, example: { field: 'details' } })
  details?: Record<string, unknown>;

  @ApiProperty({ example: '2025-11-11T12:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/api/example' })
  path: string;
}
