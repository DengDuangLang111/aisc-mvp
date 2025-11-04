import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 通用分页请求参数
 */
export class PaginationDto {
  @ApiPropertyOptional({
    description: '每页数量',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: '跳过的记录数（从第几条开始）',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}

/**
 * 分页响应接口
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * 创建标准分页响应
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number,
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + data.length < total,
    },
  };
}
