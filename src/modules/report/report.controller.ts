import { Controller, Get, Param, Patch } from '@nestjs/common';
import { ReportService } from './report.service';

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get()
  async getAllReports() {
    return this.reportService.findAll();
  }

  @Patch(':id/resolve')
  async resolve(@Param('id') id: string) {
    return this.reportService.resolveReport(id);
  }
}
