import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../database/prisma.service';
import { CreatePropertyDto, UpdatePropertyDto } from './dto/property.dto';
import { FraudService } from '../fraud/fraud.service';
import { PropertyStatus } from '../types/prisma.types';

interface FindAllParams {
  skip?: number;
  take?: number;
  where?: Record<string, unknown>;
  orderBy?: Record<string, 'asc' | 'desc'>;
}

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fraudService: FraudService,
  ) {}

  async create(createPropertyDto: CreatePropertyDto, ownerId: string) {
    const { price, squareFeet, lotSize, ...rest } = createPropertyDto;

    const property = await this.prisma.property.create({
      data: {
        ...rest,
        price: new Decimal(price.toString()),
        squareFeet: squareFeet ? new Decimal(squareFeet.toString()) : null,
        lotSize: lotSize ? new Decimal(lotSize.toString()) : null,
        owner: {
          connect: { id: ownerId },
        },
      },
    });

    await this.fraudService.evaluatePropertyCreated(property.id);

    return property;
  }

  async findAll(params?: FindAllParams) {
    const { skip, take, where, orderBy } = params || {};
    return this.prisma.property.findMany({
      skip,
      take,
      where,
      orderBy,
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.property.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        documents: true,
      },
    });
  }

  async update(id: string, updatePropertyDto: UpdatePropertyDto) {
    const { price, squareFeet, lotSize, ...rest } = updatePropertyDto;

    return this.prisma.property.update({
      where: { id },
      data: {
        ...rest,
        price: price ? new Decimal(price.toString()) : undefined,
        squareFeet: squareFeet ? new Decimal(squareFeet.toString()) : undefined,
        lotSize: lotSize ? new Decimal(lotSize.toString()) : undefined,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.property.delete({
      where: { id },
    });
  }

  async findByOwnerId(ownerId: string) {
    return this.prisma.property.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async bulkUpdatePropertyStatus(
    propertyIds: string[],
    status: PropertyStatus,
  ): Promise<{ updatedCount: number }> {
    const validStatus =
      status === PropertyStatus.DRAFT
        ? 'DRAFT'
        : status === PropertyStatus.ARCHIVED
        ? 'ARCHIVED'
        : 'ACTIVE';

    const result = await this.prisma.property.updateMany({
      where: { id: { in: propertyIds } },
      data: { status: validStatus },
    });

    return { updatedCount: result.count };
  }

  async bulkDeleteProperties(propertyIds: string[]): Promise<{
    deletedCount: number;
    propertyIds: string[];
  }> {
    const result = await this.prisma.property.deleteMany({
      where: { id: { in: propertyIds } },
    });

    return {
      deletedCount: result.count,
      propertyIds,
    };
  }

  async bulkExportProperties(
    propertyIds: string[],
    filter?: string,
  ): Promise<{ total: number; data: Record<string, any>[] }> {
    const propertyWhere: Record<string, unknown> = { id: { in: propertyIds } };

    if (filter) {
      propertyWhere.title = { contains: filter, mode: 'insensitive' as const };
    }

    const properties = await this.prisma.property.findMany({
      where: propertyWhere,
      select: {
        id: true,
        title: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        price: true,
        propertyType: true,
        bedrooms: true,
        bathrooms: true,
        squareFeet: true,
        lotSize: true,
        yearBuilt: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        ownerId: true,
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    const exportData: Record<string, any>[] = properties.map((prop: Record<string, any>) => ({
      id: prop.id,
      title: prop.title,
      address: prop.address,
      city: prop.city,
      state: prop.state,
      zipCode: prop.zipCode,
      price: Number(prop.price),
      propertyType: prop.propertyType,
      bedrooms: prop.bedrooms,
      bathrooms: prop.bathrooms,
      squareFeet: prop.squareFeet,
      lotSize: prop.lotSize,
      yearBuilt: prop.yearBuilt,
      status: prop.status,
      ownerId: prop.ownerId,
      ownerEmail: prop.owner.email,
      ownerName: `${prop.owner.firstName} ${prop.owner.lastName}`,
      ownerPhone: prop.owner.phone,
      createdAt: prop.createdAt,
      updatedAt: prop.updatedAt,
    }));

    return {
      total: exportData.length,
      data: exportData,
    };
  }
}
