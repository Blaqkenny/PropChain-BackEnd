import { Test, TestingModule } from '@nestjs/testing';
import { PropertiesService } from './properties.service';
import { PrismaService } from '../database/prisma.service';
import { FraudService } from '../fraud/fraud.service';
import { CreatePropertyDto } from './dto/property.dto';
import { Decimal } from '@prisma/client/runtime/library';

describe('PropertiesService', () => {
  let service: PropertiesService;
  let prisma: PrismaService;
  let fraudService: FraudService;

  const mockProperty = {
    id: 'prop-123',
    title: 'Beautiful Beach Condo',
    address: '123 Beach Ave',
    city: 'Miami',
    state: 'FL',
    zipCode: '33101',
    price: new Decimal('450000'),
    propertyType: 'Condo',
    status: 'DRAFT',
    ownerId: 'user-123',
  };

  const mockPrismaService = {
    property: {
      create: jest.fn().mockResolvedValue(mockProperty),
    },
  };

  const mockFraudService = {
    evaluatePropertyCreated: jest.fn().mockResolvedValue(null),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertiesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: FraudService,
          useValue: mockFraudService,
        },
      ],
    }).compile();

    service = module.get<PropertiesService>(PropertiesService);
    prisma = module.get<PrismaService>(PrismaService);
    fraudService = module.get<FraudService>(FraudService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create property listing and run fraud evaluation', async () => {
      const createDto: CreatePropertyDto = {
        title: 'Beautiful Beach Condo',
        address: '123 Beach Ave',
        city: 'Miami',
        state: 'FL',
        zipCode: '33101',
        price: 450000,
        propertyType: 'Condo',
      };

      const result = await service.create(createDto, 'user-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('prop-123');
      expect(result.status).toBe('DRAFT');
      expect(prisma.property.create).toHaveBeenCalledWith({
        data: {
          title: 'Beautiful Beach Condo',
          address: '123 Beach Ave',
          city: 'Miami',
          state: 'FL',
          zipCode: '33101',
          price: new Decimal('450000'),
          propertyType: 'Condo',
          squareFeet: null,
          lotSize: null,
          status: 'DRAFT',
          owner: {
            connect: { id: 'user-123' },
          },
        },
      });
      expect(fraudService.evaluatePropertyCreated).toHaveBeenCalledWith('prop-123');
    });
  });
});
