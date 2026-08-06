import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from '../common/entities/plan.entity';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(Plan)
    private readonly plansRepository: Repository<Plan>,
  ) {}

  async list(): Promise<Plan[]> {
    return this.plansRepository.find({ order: { price: 'ASC' } });
  }

  async create(dto: CreatePlanDto): Promise<Plan> {
    const plan = this.plansRepository.create(dto);
    return this.plansRepository.save(plan);
  }

  async update(id: string, dto: UpdatePlanDto): Promise<Plan> {
    const plan = await this.plansRepository.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    Object.assign(plan, dto);
    return this.plansRepository.save(plan);
  }

  async findById(id: string): Promise<Plan> {
    const plan = await this.plansRepository.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }
}
