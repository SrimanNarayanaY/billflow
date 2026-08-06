import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn(['free', 'pro', 'business'])
  tier: 'free' | 'pro' | 'business';

  @IsIn(['month'])
  billingInterval: 'month';

  @IsInt()
  @Min(0)
  price: number;

  @IsOptional()
  @IsObject()
  usageLimits?: Record<string, number>;

  @IsOptional()
  @IsObject()
  overagePrices?: Record<string, number>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
