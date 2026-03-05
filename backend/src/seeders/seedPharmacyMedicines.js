const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Medicine = require('../models/NH_Medicine');

const manufacturers = [
  'Sun Pharma',
  'Cipla',
  'Dr Reddys',
  'Lupin',
  'Torrent Pharma',
  'Mankind Pharma',
  'Alkem Labs',
  'Abbott',
  'GSK',
  'Pfizer'
];

const hsnCodes = ['30049011', '30049012', '30049019', '30039011', '30039019'];

const categoryUnitMap = {
  tablet: 'tablet',
  capsule: 'capsule',
  syrup: 'bottle',
  injection: 'vial',
  ointment: 'tube',
  drops: 'bottle',
  inhaler: 'inhaler',
  powder: 'sachet',
  other: 'unit'
};

const categoryMrpBand = {
  tablet: [25, 650],
  capsule: [35, 750],
  syrup: [45, 320],
  injection: [70, 2100],
  ointment: [60, 420],
  drops: [55, 380],
  inhaler: [180, 950],
  powder: [80, 600],
  other: [90, 2200]
};

const medicineRows = [];

const addRows = (category, rows) => {
  rows.forEach((row) => {
    medicineRows.push({ category, ...row });
  });
};

addRows('tablet', [
  { name: 'Paracetamol 500 Tablet', genericName: 'Paracetamol', composition: 'Paracetamol 500 mg' },
  { name: 'Paracetamol 650 Tablet', genericName: 'Paracetamol', composition: 'Paracetamol 650 mg' },
  { name: 'Ibuprofen 400 Tablet', genericName: 'Ibuprofen', composition: 'Ibuprofen 400 mg' },
  { name: 'Diclofenac Sodium 50 Tablet', genericName: 'Diclofenac', composition: 'Diclofenac Sodium 50 mg' },
  { name: 'Aceclofenac 100 Tablet', genericName: 'Aceclofenac', composition: 'Aceclofenac 100 mg' },
  { name: 'Naproxen 500 Tablet', genericName: 'Naproxen', composition: 'Naproxen 500 mg' },
  { name: 'Aspirin 75 Tablet', genericName: 'Aspirin', composition: 'Aspirin 75 mg' },
  { name: 'Clopidogrel 75 Tablet', genericName: 'Clopidogrel', composition: 'Clopidogrel 75 mg', schedule: 'H1' },
  { name: 'Atorvastatin 10 Tablet', genericName: 'Atorvastatin', composition: 'Atorvastatin 10 mg' },
  { name: 'Atorvastatin 20 Tablet', genericName: 'Atorvastatin', composition: 'Atorvastatin 20 mg' },
  { name: 'Rosuvastatin 10 Tablet', genericName: 'Rosuvastatin', composition: 'Rosuvastatin 10 mg' },
  { name: 'Metformin 500 Tablet', genericName: 'Metformin', composition: 'Metformin 500 mg' },
  { name: 'Metformin 1000 Tablet', genericName: 'Metformin', composition: 'Metformin 1000 mg' },
  { name: 'Glimepiride 1 Tablet', genericName: 'Glimepiride', composition: 'Glimepiride 1 mg' },
  { name: 'Glimepiride 2 Tablet', genericName: 'Glimepiride', composition: 'Glimepiride 2 mg' },
  { name: 'Teneligliptin 20 Tablet', genericName: 'Teneligliptin', composition: 'Teneligliptin 20 mg' },
  { name: 'Sitagliptin 100 Tablet', genericName: 'Sitagliptin', composition: 'Sitagliptin 100 mg' },
  { name: 'Telmisartan 40 Tablet', genericName: 'Telmisartan', composition: 'Telmisartan 40 mg' },
  { name: 'Losartan 50 Tablet', genericName: 'Losartan', composition: 'Losartan Potassium 50 mg' },
  { name: 'Amlodipine 5 Tablet', genericName: 'Amlodipine', composition: 'Amlodipine 5 mg' },
  { name: 'Metoprolol XL 25 Tablet', genericName: 'Metoprolol Succinate', composition: 'Metoprolol Succinate 25 mg' },
  { name: 'Bisoprolol 5 Tablet', genericName: 'Bisoprolol', composition: 'Bisoprolol 5 mg' },
  { name: 'Furosemide 40 Tablet', genericName: 'Furosemide', composition: 'Furosemide 40 mg' },
  { name: 'Spironolactone 25 Tablet', genericName: 'Spironolactone', composition: 'Spironolactone 25 mg' },
  { name: 'Pantoprazole 40 Tablet', genericName: 'Pantoprazole', composition: 'Pantoprazole 40 mg' },
  { name: 'Rabeprazole 20 Tablet', genericName: 'Rabeprazole', composition: 'Rabeprazole 20 mg' },
  { name: 'Domperidone 10 Tablet', genericName: 'Domperidone', composition: 'Domperidone 10 mg' },
  { name: 'Ondansetron 4 Tablet', genericName: 'Ondansetron', composition: 'Ondansetron 4 mg' },
  { name: 'Levocetirizine 5 Tablet', genericName: 'Levocetirizine', composition: 'Levocetirizine 5 mg' },
  { name: 'Cetirizine 10 Tablet', genericName: 'Cetirizine', composition: 'Cetirizine 10 mg' },
  { name: 'Montelukast 10 Tablet', genericName: 'Montelukast', composition: 'Montelukast 10 mg' },
  { name: 'Azithromycin 500 Tablet', genericName: 'Azithromycin', composition: 'Azithromycin 500 mg', schedule: 'H1' },
  { name: 'Amoxicillin Clavulanate 625 Tablet', genericName: 'Amoxicillin and Clavulanate', composition: 'Amoxicillin 500 mg + Clavulanic Acid 125 mg', schedule: 'H1' },
  { name: 'Cefixime 200 Tablet', genericName: 'Cefixime', composition: 'Cefixime 200 mg', schedule: 'H1' },
  { name: 'Doxycycline 100 Tablet', genericName: 'Doxycycline', composition: 'Doxycycline 100 mg', schedule: 'H1' },
  { name: 'Linezolid 600 Tablet', genericName: 'Linezolid', composition: 'Linezolid 600 mg', schedule: 'H1' },
  { name: 'Levothyroxine 50 Tablet', genericName: 'Levothyroxine', composition: 'Levothyroxine 50 mcg' },
  { name: 'Escitalopram 10 Tablet', genericName: 'Escitalopram', composition: 'Escitalopram 10 mg', schedule: 'H1' },
  { name: 'Sertraline 50 Tablet', genericName: 'Sertraline', composition: 'Sertraline 50 mg', schedule: 'H1' },
  { name: 'Alprazolam 0.5 Tablet', genericName: 'Alprazolam', composition: 'Alprazolam 0.5 mg', schedule: 'H1' },
  { name: 'Calcium with Vitamin D3 Tablet', genericName: 'Calcium Carbonate and Vitamin D3', composition: 'Calcium Carbonate 500 mg + Vitamin D3 250 IU' },
  { name: 'Ferrous Ascorbate Folic Tablet', genericName: 'Ferrous Ascorbate and Folic Acid', composition: 'Ferrous Ascorbate 100 mg + Folic Acid 1.5 mg' }
]);

addRows('capsule', [
  { name: 'Omeprazole 20 Capsule', genericName: 'Omeprazole', composition: 'Omeprazole 20 mg' },
  { name: 'Esomeprazole 40 Capsule', genericName: 'Esomeprazole', composition: 'Esomeprazole 40 mg' },
  { name: 'Rabeprazole SR Capsule', genericName: 'Rabeprazole', composition: 'Rabeprazole 20 mg (SR)' },
  { name: 'Pregabalin 75 Capsule', genericName: 'Pregabalin', composition: 'Pregabalin 75 mg', schedule: 'H1' },
  { name: 'Pregabalin 150 Capsule', genericName: 'Pregabalin', composition: 'Pregabalin 150 mg', schedule: 'H1' },
  { name: 'Gabapentin 300 Capsule', genericName: 'Gabapentin', composition: 'Gabapentin 300 mg', schedule: 'H1' },
  { name: 'Amoxicillin 500 Capsule', genericName: 'Amoxicillin', composition: 'Amoxicillin 500 mg', schedule: 'H1' },
  { name: 'Cephalexin 500 Capsule', genericName: 'Cephalexin', composition: 'Cephalexin 500 mg', schedule: 'H1' },
  { name: 'Doxycycline 100 Capsule', genericName: 'Doxycycline', composition: 'Doxycycline 100 mg', schedule: 'H1' },
  { name: 'Fluconazole 150 Capsule', genericName: 'Fluconazole', composition: 'Fluconazole 150 mg', schedule: 'H1' },
  { name: 'Itraconazole 100 Capsule', genericName: 'Itraconazole', composition: 'Itraconazole 100 mg', schedule: 'H1' },
  { name: 'Multivitamin B Complex Capsule', genericName: 'Multivitamin', composition: 'Vitamin B Complex + Zinc + Selenium' },
  { name: 'Vitamin E Capsule 400', genericName: 'Vitamin E', composition: 'Tocopheryl Acetate 400 IU' },
  { name: 'Orlistat 120 Capsule', genericName: 'Orlistat', composition: 'Orlistat 120 mg', schedule: 'H' },
  { name: 'Duloxetine 30 Capsule', genericName: 'Duloxetine', composition: 'Duloxetine 30 mg', schedule: 'H1' },
  { name: 'Duloxetine 60 Capsule', genericName: 'Duloxetine', composition: 'Duloxetine 60 mg', schedule: 'H1' }
]);

addRows('syrup', [
  { name: 'Paracetamol Syrup', genericName: 'Paracetamol', composition: 'Paracetamol 250 mg/5 ml' },
  { name: 'Ibuprofen Syrup', genericName: 'Ibuprofen', composition: 'Ibuprofen 100 mg/5 ml' },
  { name: 'Cough Expectorant Syrup', genericName: 'Ambroxol and Guaifenesin', composition: 'Ambroxol 15 mg + Guaifenesin 50 mg + Terbutaline 1.25 mg/5 ml' },
  { name: 'Dextromethorphan Cough Syrup', genericName: 'Dextromethorphan and Chlorpheniramine', composition: 'Dextromethorphan 10 mg + Chlorpheniramine 2 mg/5 ml' },
  { name: 'Lactulose Syrup', genericName: 'Lactulose', composition: 'Lactulose 10 g/15 ml' },
  { name: 'Antacid Mint Syrup', genericName: 'Aluminium Hydroxide and Magnesium Hydroxide', composition: 'Aluminium Hydroxide + Magnesium Hydroxide + Simethicone' },
  { name: 'Multivitamin Syrup', genericName: 'Multivitamin', composition: 'Vitamin A + B Complex + D3 + Zinc' },
  { name: 'Iron Folic Acid Syrup', genericName: 'Iron and Folic Acid', composition: 'Ferrous Ammonium Citrate + Folic Acid + Cyanocobalamin' },
  { name: 'Cyproheptadine Tonic', genericName: 'Cyproheptadine', composition: 'Cyproheptadine 2 mg/5 ml' },
  { name: 'Ambroxol Syrup', genericName: 'Ambroxol', composition: 'Ambroxol 30 mg/5 ml' },
  { name: 'Azithromycin Oral Suspension', genericName: 'Azithromycin', composition: 'Azithromycin 200 mg/5 ml', schedule: 'H1' },
  { name: 'Cefixime Oral Suspension', genericName: 'Cefixime', composition: 'Cefixime 100 mg/5 ml', schedule: 'H1' },
  { name: 'Ondansetron Syrup', genericName: 'Ondansetron', composition: 'Ondansetron 2 mg/5 ml' },
  { name: 'Cholecalciferol Nano Drops Syrup', genericName: 'Cholecalciferol', composition: 'Vitamin D3 400 IU/ml' }
]);

addRows('injection', [
  { name: 'Ceftriaxone 1g Injection', genericName: 'Ceftriaxone', composition: 'Ceftriaxone 1 g', schedule: 'H1' },
  { name: 'Amikacin 500 Injection', genericName: 'Amikacin', composition: 'Amikacin 500 mg/2 ml', schedule: 'H1' },
  { name: 'Pantoprazole Injection', genericName: 'Pantoprazole', composition: 'Pantoprazole 40 mg' },
  { name: 'Ondansetron Injection', genericName: 'Ondansetron', composition: 'Ondansetron 4 mg/2 ml' },
  { name: 'Diclofenac Injection', genericName: 'Diclofenac', composition: 'Diclofenac Sodium 75 mg/3 ml' },
  { name: 'Tramadol Injection', genericName: 'Tramadol', composition: 'Tramadol 100 mg/2 ml', schedule: 'H1' },
  { name: 'Insulin Regular Injection', genericName: 'Human Insulin', composition: 'Human Insulin 40 IU/ml', schedule: 'H' },
  { name: 'Heparin Injection', genericName: 'Heparin', composition: 'Heparin Sodium 5000 IU/ml', schedule: 'H' },
  { name: 'Methylprednisolone Injection', genericName: 'Methylprednisolone', composition: 'Methylprednisolone 125 mg' },
  { name: 'Meropenem 1g Injection', genericName: 'Meropenem', composition: 'Meropenem 1 g', schedule: 'H1' },
  { name: 'Piperacillin Tazobactam Injection', genericName: 'Piperacillin and Tazobactam', composition: 'Piperacillin 4 g + Tazobactam 0.5 g', schedule: 'H1' },
  { name: 'Tranexamic Acid Injection', genericName: 'Tranexamic Acid', composition: 'Tranexamic Acid 500 mg/5 ml' }
]);

addRows('ointment', [
  { name: 'Mupirocin Ointment', genericName: 'Mupirocin', composition: 'Mupirocin 2% w/w', schedule: 'H1' },
  { name: 'Clotrimazole Cream', genericName: 'Clotrimazole', composition: 'Clotrimazole 1% w/w' },
  { name: 'Betamethasone Cream', genericName: 'Betamethasone', composition: 'Betamethasone 0.1% w/w', schedule: 'H' },
  { name: 'Ketoconazole Cream', genericName: 'Ketoconazole', composition: 'Ketoconazole 2% w/w', schedule: 'H1' },
  { name: 'Silver Sulfadiazine Cream', genericName: 'Silver Sulfadiazine', composition: 'Silver Sulfadiazine 1% w/w' },
  { name: 'Diclofenac Gel', genericName: 'Diclofenac', composition: 'Diclofenac Diethylamine 1.16% w/w' },
  { name: 'Lignocaine Gel', genericName: 'Lidocaine', composition: 'Lidocaine 2% w/w' }
]);

addRows('drops', [
  { name: 'Moxifloxacin Eye Drops', genericName: 'Moxifloxacin', composition: 'Moxifloxacin 0.5% w/v', schedule: 'H1' },
  { name: 'Carboxymethylcellulose Eye Drops', genericName: 'Carboxymethylcellulose', composition: 'Carboxymethylcellulose 0.5% w/v' },
  { name: 'Timolol Eye Drops', genericName: 'Timolol', composition: 'Timolol Maleate 0.5% w/v', schedule: 'H' },
  { name: 'Ofloxacin Ear Drops', genericName: 'Ofloxacin', composition: 'Ofloxacin 0.3% w/v', schedule: 'H1' },
  { name: 'Nasal Saline Drops', genericName: 'Sodium Chloride', composition: 'Sodium Chloride 0.65% w/v' },
  { name: 'Pediatric Vitamin D3 Drops', genericName: 'Cholecalciferol', composition: 'Vitamin D3 400 IU/ml' }
]);

addRows('inhaler', [
  { name: 'Salbutamol Inhaler 100', genericName: 'Salbutamol', composition: 'Salbutamol 100 mcg per puff' },
  { name: 'Budesonide Inhaler 200', genericName: 'Budesonide', composition: 'Budesonide 200 mcg per puff' },
  { name: 'Formoterol Budesonide Inhaler', genericName: 'Formoterol and Budesonide', composition: 'Formoterol 6 mcg + Budesonide 200 mcg per puff' },
  { name: 'Tiotropium Inhaler', genericName: 'Tiotropium', composition: 'Tiotropium 18 mcg per capsule', schedule: 'H' },
  { name: 'Levosalbutamol Inhaler', genericName: 'Levosalbutamol', composition: 'Levosalbutamol 50 mcg per puff' }
]);

addRows('powder', [
  { name: 'ORS Powder Sachet', genericName: 'Oral Rehydration Salts', composition: 'WHO ORS formula powder for oral solution' },
  { name: 'Protein Supplement Powder', genericName: 'Whey Protein', composition: 'Protein blend with vitamins and minerals' },
  { name: 'Isabgol Husk Powder', genericName: 'Psyllium Husk', composition: 'Ispaghula Husk 3.5 g per sachet' },
  { name: 'Probiotic Powder Sachet', genericName: 'Lactic Acid Bacillus', composition: 'Lactic Acid Bacillus 120 million spores per sachet' },
  { name: 'Electrolyte Powder Sachet', genericName: 'Electrolyte Mix', composition: 'Dextrose + Sodium Chloride + Potassium Chloride + Citrate' }
]);

addRows('other', [
  { name: 'Insulin Pen Cartridge 30', genericName: 'Insulin Glargine', composition: 'Insulin Glargine 100 IU/ml', schedule: 'H' },
  { name: 'Nicotine Gum 2', genericName: 'Nicotine', composition: 'Nicotine 2 mg chewing gum' },
  { name: 'Nicotine Patch 21', genericName: 'Nicotine', composition: 'Nicotine 21 mg transdermal patch' },
  { name: 'Sublingual Nitroglycerin Spray', genericName: 'Nitroglycerin', composition: 'Nitroglycerin 0.4 mg per spray' },
  { name: 'Activated Charcoal Suspension', genericName: 'Activated Charcoal', composition: 'Activated Charcoal oral suspension' }
]);

const pseudoRandom = (index, min, max) => {
  const span = max - min + 1;
  return min + ((index * 37 + 13) % span);
};

const buildMedicines = (count = 100) => {
  const baseRows = medicineRows.slice(0, count);

  return baseRows.map((row, index) => {
    const [minMrp, maxMrp] = categoryMrpBand[row.category] || [50, 500];
    const mrp = pseudoRandom(index, minMrp, maxMrp);
    const sellingPrice = Math.max(1, Math.round(mrp * 0.92));
    const purchasePrice = Math.max(1, Math.round(mrp * 0.68));
    const stock = pseudoRandom(index + 3, 20, 240);
    const reorderLevel = pseudoRandom(index + 7, 8, 35);

    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + pseudoRandom(index + 11, 10, 48));

    const aisle = String.fromCharCode(65 + (index % 6));
    const rack = pseudoRandom(index + 5, 1, 12);
    const shelf = pseudoRandom(index + 9, 1, 6);
    const month = String(expiryDate.getMonth() + 1).padStart(2, '0');
    const year = String(expiryDate.getFullYear()).slice(-2);
    const sequence = String(index + 1).padStart(4, '0');

    return {
      name: row.name,
      genericName: row.genericName,
      composition: row.composition,
      category: row.category,
      manufacturer: manufacturers[index % manufacturers.length],
      batchNumber: `B${year}${month}${sequence}`,
      expiryDate,
      mrp,
      sellingPrice,
      purchasePrice,
      stock,
      reorderLevel,
      unit: categoryUnitMap[row.category] || 'pcs',
      rackLocation: `${aisle}-${rack}-S${shelf}`,
      hsnCode: hsnCodes[index % hsnCodes.length],
      gstPercent: row.category === 'inhaler' ? 18 : 12,
      schedule: row.schedule || '',
      isActive: true
    };
  });
};

const seedPharmacyMedicines = async () => {
  try {
    await connectDB();

    const seedCount = 100;
    const keepExisting = process.env.KEEP_EXISTING === 'true';
    const medicines = buildMedicines(seedCount);

    if (!keepExisting) {
      await Medicine.deleteMany({});
      console.log('Cleared existing medicines collection.');
    }

    await Medicine.insertMany(medicines, { ordered: true });
    const total = await Medicine.countDocuments({});

    console.log(`Seeded ${medicines.length} pharmacy medicines.`);
    console.log(`Total medicines in collection: ${total}.`);
    process.exit(0);
  } catch (error) {
    console.error('Pharmacy medicines seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

seedPharmacyMedicines();
