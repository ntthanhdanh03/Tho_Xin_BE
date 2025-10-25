// src/modules/report/report.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Report } from 'src/schemas/report.schema';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(@InjectModel(Report.name) private reportModel: Model<Report>) {}

  async createReport(data: {
    message: string;
    userId?: string;
    reason?: string;
  }) {
    const report = new this.reportModel({
      ...data,
      type: 'redirect',
    });
    await report.save();
    this.logger.warn(`⚠️ Redirect report created for message: ${data.message}`);
    return report;
  }

  async findAll() {
    return this.reportModel.find().sort({ createdAt: -1 });
  }

  async resolveReport(id: string) {
    return this.reportModel.findByIdAndUpdate(
      id,
      { resolved: true },
      { new: true },
    );
  }
}
