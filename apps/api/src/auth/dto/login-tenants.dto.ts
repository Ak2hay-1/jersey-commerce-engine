import { ApiProperty } from '@nestjs/swagger';

export class LoginTenantOptionDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;
}

export class LoginTenantsResponseDto {
  @ApiProperty({ type: [LoginTenantOptionDto] })
  items!: LoginTenantOptionDto[];
}
