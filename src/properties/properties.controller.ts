import { Body, Controller, Get, Post, Put, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto, UpdatePropertyDto } from './dto/property.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUserPayload } from '../auth/types/auth-user.type';
import { UserRole } from '../types/prisma.types';
import {
  BulkPropertyStatusUpdateDto,
  BulkPropertyDeleteDto,
  BulkPropertyExportDto,
} from './dto/bulk-operations.dto';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createPropertyDto: CreatePropertyDto, @CurrentUser() user: AuthUserPayload) {
    return this.propertiesService.create(createPropertyDto, user.sub);
  }

  @Get()
  findAll() {
    return this.propertiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.propertiesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @Put(':id')
  update(@Param('id') id: string, @Body() updatePropertyDto: UpdatePropertyDto) {
    return this.propertiesService.update(id, updatePropertyDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.propertiesService.remove(id);
  }

  @Post('bulk/status')
  async bulkUpdatePropertyStatus(
    @Body() body: BulkPropertyStatusUpdateDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.propertiesService.bulkUpdatePropertyStatus(body.propertyIds, body.status);
  }

  @Post('bulk/delete')
  async bulkDeleteProperties(
    @Body() body: BulkPropertyDeleteDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.propertiesService.bulkDeleteProperties(body.propertyIds);
  }

  @Post('bulk/export')
  async bulkExportProperties(
    @Body() body: BulkPropertyExportDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.propertiesService.bulkExportProperties(body.propertyIds, body.filter);
  }
}
