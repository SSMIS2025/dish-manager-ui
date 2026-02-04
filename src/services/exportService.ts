// Export Service for PDF and Excel generation

interface ProjectData {
  id?: string;
  name: string;
  description?: string;
  createdBy?: string;
  lnbs?: any[];
  switches?: any[];
  motors?: any[];
  unicables?: any[];
  satellites?: any[];
}

class ExportService {
  /**
   * Export project data to Excel (CSV format - browser compatible)
   */
  exportToExcel(project: ProjectData, mappings: any[], allEquipment: {
    lnbs: any[];
    switches: any[];
    motors: any[];
    unicables: any[];
    satellites: any[];
  }): void {
    const getMappedItems = (type: string, items: any[]) => {
      const mappedIds = mappings
        .filter(m => m.equipmentType === type)
        .map(m => m.equipmentId);
      return items.filter(item => mappedIds.includes(item.id));
    };

    // Create CSV content
    let csv = '';
    
    // Project Info
    csv += 'PROJECT INFORMATION\n';
    csv += `Name,${this.escapeCSV(project.name)}\n`;
    csv += `Description,${this.escapeCSV(project.description || '')}\n`;
    csv += `Created By,${this.escapeCSV(project.createdBy || '')}\n`;
    csv += '\n';

    // LNBs
    const mappedLnbs = getMappedItems('lnbs', allEquipment.lnbs);
    if (mappedLnbs.length > 0) {
      csv += 'LNB EQUIPMENT\n';
      csv += 'Name,Type,Band Type,Low Frequency,High Frequency,Power Control\n';
      mappedLnbs.forEach(lnb => {
        csv += `${this.escapeCSV(lnb.name)},${this.escapeCSV(lnb.lnbType || '')},${this.escapeCSV(lnb.bandType || '')},${this.escapeCSV(lnb.lowFrequency || '')},${this.escapeCSV(lnb.highFrequency || '')},${this.escapeCSV(lnb.powerControl || '')}\n`;
      });
      csv += '\n';
    }

    // Switches
    const mappedSwitches = getMappedItems('switches', allEquipment.switches);
    if (mappedSwitches.length > 0) {
      csv += 'SWITCH EQUIPMENT\n';
      csv += 'Name,Type,Configuration\n';
      mappedSwitches.forEach(sw => {
        csv += `${this.escapeCSV(sw.name)},${this.escapeCSV(sw.switchType || '')},${this.escapeCSV(sw.switchConfiguration || '')}\n`;
      });
      csv += '\n';
    }

    // Motors
    const mappedMotors = getMappedItems('motors', allEquipment.motors);
    if (mappedMotors.length > 0) {
      csv += 'MOTOR EQUIPMENT\n';
      csv += 'Name,Type,Position,Longitude,Latitude,Status\n';
      mappedMotors.forEach(motor => {
        csv += `${this.escapeCSV(motor.name)},${this.escapeCSV(motor.type || '')},${this.escapeCSV(motor.position || '')},${this.escapeCSV(motor.longitude || '')},${this.escapeCSV(motor.latitude || '')},${this.escapeCSV(motor.status || '')}\n`;
      });
      csv += '\n';
    }

    // Unicables
    const mappedUnicables = getMappedItems('unicables', allEquipment.unicables);
    if (mappedUnicables.length > 0) {
      csv += 'UNICABLE EQUIPMENT\n';
      csv += 'Name,Type,Port,Status\n';
      mappedUnicables.forEach(unicable => {
        csv += `${this.escapeCSV(unicable.name)},${this.escapeCSV(unicable.type || '')},${this.escapeCSV(unicable.port || '')},${this.escapeCSV(unicable.status || '')}\n`;
      });
      csv += '\n';
    }

    // Satellites
    const mappedSatellites = getMappedItems('satellites', allEquipment.satellites);
    if (mappedSatellites.length > 0) {
      csv += 'SATELLITES\n';
      csv += 'Name,Position,Direction,Carriers,Total Services\n';
      mappedSatellites.forEach(sat => {
        const carrierCount = sat.carriers?.length || 0;
        const serviceCount = sat.carriers?.reduce((sum: number, c: any) => sum + (c.services?.length || 0), 0) || 0;
        csv += `${this.escapeCSV(sat.name)},${this.escapeCSV(sat.position || '')},${this.escapeCSV(sat.direction || '')},${carrierCount},${serviceCount}\n`;
      });
      csv += '\n';

      // Carriers and Services
      mappedSatellites.forEach(sat => {
        if (sat.carriers && sat.carriers.length > 0) {
          csv += `CARRIERS FOR: ${sat.name}\n`;
          csv += 'Name,Frequency,Polarization,Symbol Rate,FEC,FEC Mode,Services Count\n';
          sat.carriers.forEach((carrier: any) => {
            csv += `${this.escapeCSV(carrier.name)},${this.escapeCSV(carrier.frequency || '')},${this.escapeCSV(carrier.polarization || '')},${this.escapeCSV(carrier.symbolRate || '')},${this.escapeCSV(carrier.fec || '')},${this.escapeCSV(carrier.fecMode || '')},${carrier.services?.length || 0}\n`;
          });
          csv += '\n';

          // Services
          sat.carriers.forEach((carrier: any) => {
            if (carrier.services && carrier.services.length > 0) {
              csv += `SERVICES FOR CARRIER: ${carrier.name}\n`;
              csv += 'Name,Frequency,Video PID,PCR PID,Program #,FAV Group,Scramble\n';
              carrier.services.forEach((service: any) => {
                csv += `${this.escapeCSV(service.name)},${this.escapeCSV(service.frequency || '')},${this.escapeCSV(service.videoPid || '')},${this.escapeCSV(service.pcrPid || '')},${this.escapeCSV(service.programNumber || '')},${this.escapeCSV(service.favGroup || '')},${service.scramble ? 'Yes' : 'No'}\n`;
              });
              csv += '\n';
            }
          });
        }
      });
    }

    // Download
    this.downloadFile(csv, `${project.name.replace(/\s+/g, '_')}_export.csv`, 'text/csv;charset=utf-8;');
  }

  /**
   * Export project data to HTML (printable as PDF)
   */
  exportToPDF(project: ProjectData, mappings: any[], allEquipment: {
    lnbs: any[];
    switches: any[];
    motors: any[];
    unicables: any[];
    satellites: any[];
  }): void {
    const getMappedItems = (type: string, items: any[]) => {
      const mappedIds = mappings
        .filter(m => m.equipmentType === type)
        .map(m => m.equipmentId);
      return items.filter(item => mappedIds.includes(item.id));
    };

    const mappedLnbs = getMappedItems('lnbs', allEquipment.lnbs);
    const mappedSwitches = getMappedItems('switches', allEquipment.switches);
    const mappedMotors = getMappedItems('motors', allEquipment.motors);
    const mappedUnicables = getMappedItems('unicables', allEquipment.unicables);
    const mappedSatellites = getMappedItems('satellites', allEquipment.satellites);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>SDB Project Export - ${this.escapeHTML(project.name)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    h1 { color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px; }
    h2 { color: #2c5282; margin-top: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
    h3 { color: #4a5568; margin-top: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px; }
    th { background: #2c5282; color: white; padding: 10px; text-align: left; }
    td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) { background: #f7fafc; }
    .info-box { background: #ebf8ff; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .info-item { margin: 5px 0; }
    .label { font-weight: bold; color: #2c5282; }
    .summary { display: flex; gap: 20px; flex-wrap: wrap; margin: 20px 0; }
    .summary-item { background: #f0f4f8; padding: 15px 20px; border-radius: 8px; text-align: center; }
    .summary-count { font-size: 24px; font-weight: bold; color: #2c5282; }
    .summary-label { color: #718096; font-size: 12px; }
    @media print { body { margin: 0; } h1 { font-size: 20px; } h2 { font-size: 16px; page-break-before: auto; } table { font-size: 10px; } }
  </style>
</head>
<body>
  <h1>SDB Project Export</h1>
  
  <div class="info-box">
    <div class="info-item"><span class="label">Project Name:</span> ${this.escapeHTML(project.name)}</div>
    <div class="info-item"><span class="label">Description:</span> ${this.escapeHTML(project.description || 'N/A')}</div>
    <div class="info-item"><span class="label">Created By:</span> ${this.escapeHTML(project.createdBy || 'N/A')}</div>
    <div class="info-item"><span class="label">Export Date:</span> ${new Date().toLocaleString()}</div>
  </div>

  <div class="summary">
    <div class="summary-item"><div class="summary-count">${mappedLnbs.length}</div><div class="summary-label">LNBs</div></div>
    <div class="summary-item"><div class="summary-count">${mappedSwitches.length}</div><div class="summary-label">Switches</div></div>
    <div class="summary-item"><div class="summary-count">${mappedMotors.length}</div><div class="summary-label">Motors</div></div>
    <div class="summary-item"><div class="summary-count">${mappedUnicables.length}</div><div class="summary-label">Unicables</div></div>
    <div class="summary-item"><div class="summary-count">${mappedSatellites.length}</div><div class="summary-label">Satellites</div></div>
  </div>

  ${mappedLnbs.length > 0 ? `
  <h2>LNB Equipment</h2>
  <table>
    <tr><th>Name</th><th>Type</th><th>Band Type</th><th>Low Freq</th><th>High Freq</th><th>Power Control</th></tr>
    ${mappedLnbs.map(lnb => `
    <tr>
      <td>${this.escapeHTML(lnb.name)}</td>
      <td>${this.escapeHTML(lnb.lnbType || '-')}</td>
      <td>${this.escapeHTML(lnb.bandType || '-')}</td>
      <td>${this.escapeHTML(lnb.lowFrequency || '-')}</td>
      <td>${this.escapeHTML(lnb.highFrequency || '-')}</td>
      <td>${this.escapeHTML(lnb.powerControl || '-')}</td>
    </tr>
    `).join('')}
  </table>
  ` : ''}

  ${mappedSwitches.length > 0 ? `
  <h2>Switch Equipment</h2>
  <table>
    <tr><th>Name</th><th>Type</th><th>Configuration</th></tr>
    ${mappedSwitches.map(sw => `
    <tr>
      <td>${this.escapeHTML(sw.name)}</td>
      <td>${this.escapeHTML(sw.switchType || '-')}</td>
      <td>${this.escapeHTML(sw.switchConfiguration || '-')}</td>
    </tr>
    `).join('')}
  </table>
  ` : ''}

  ${mappedMotors.length > 0 ? `
  <h2>Motor Equipment</h2>
  <table>
    <tr><th>Name</th><th>Type</th><th>Position</th><th>Longitude</th><th>Latitude</th><th>Status</th></tr>
    ${mappedMotors.map(motor => `
    <tr>
      <td>${this.escapeHTML(motor.name)}</td>
      <td>${this.escapeHTML(motor.type || '-')}</td>
      <td>${this.escapeHTML(motor.position || '-')}</td>
      <td>${this.escapeHTML(motor.longitude || '-')}</td>
      <td>${this.escapeHTML(motor.latitude || '-')}</td>
      <td>${this.escapeHTML(motor.status || '-')}</td>
    </tr>
    `).join('')}
  </table>
  ` : ''}

  ${mappedUnicables.length > 0 ? `
  <h2>Unicable Equipment</h2>
  <table>
    <tr><th>Name</th><th>Type</th><th>Port</th><th>Status</th></tr>
    ${mappedUnicables.map(unicable => `
    <tr>
      <td>${this.escapeHTML(unicable.name)}</td>
      <td>${this.escapeHTML(unicable.type || '-')}</td>
      <td>${this.escapeHTML(unicable.port || '-')}</td>
      <td>${this.escapeHTML(unicable.status || '-')}</td>
    </tr>
    `).join('')}
  </table>
  ` : ''}

  ${mappedSatellites.length > 0 ? `
  <h2>Satellites</h2>
  ${mappedSatellites.map(sat => `
  <h3>${this.escapeHTML(sat.name)} (${this.escapeHTML(sat.position || '')} ${this.escapeHTML(sat.direction || '')})</h3>
  ${sat.carriers && sat.carriers.length > 0 ? `
  <table>
    <tr><th>Carrier</th><th>Frequency</th><th>Polarization</th><th>Symbol Rate</th><th>FEC</th><th>Services</th></tr>
    ${sat.carriers.map((carrier: any) => `
    <tr>
      <td>${this.escapeHTML(carrier.name)}</td>
      <td>${this.escapeHTML(carrier.frequency || '-')}</td>
      <td>${this.escapeHTML(carrier.polarization || '-')}</td>
      <td>${this.escapeHTML(carrier.symbolRate || '-')}</td>
      <td>${this.escapeHTML(carrier.fec || '-')}</td>
      <td>${carrier.services?.length || 0}</td>
    </tr>
    `).join('')}
  </table>
  ` : '<p>No carriers configured</p>'}
  `).join('')}
  ` : ''}

</body>
</html>
    `;

    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      // Auto-trigger print dialog
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  }

  private escapeCSV(value: string): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  private escapeHTML(value: string): string {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

export const exportService = new ExportService();
