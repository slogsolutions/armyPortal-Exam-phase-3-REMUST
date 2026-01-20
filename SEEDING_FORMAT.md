# Trade Seeding Format Documentation

## 📋 **Overview**

This document explains the format and structure for seeding trades with negative marking and paper patterns into the Army Exam Portal database.

## 🎯 **Seeding Commands**

### **1. Comprehensive Seeding**
```bash
cd server
npm run seed
```
This will:
- ✅ Seed all 10 trades with configuration
- ✅ Create exam papers for enabled types
- ✅ Add sample questions for testing

### **2. Trade-Only Seeding**
```bash
cd server
npm run seed-trades
```
This will:
- ✅ Seed only trades with paper patterns
- ❌ No sample questions added

## 🏗️ **Trade Configuration Structure**

### **Trade Object Format**
```javascript
{
  name: "TRADE_NAME",
  negativeMarking: 0.25,        // Negative marking per wrong answer (0.0 - 0.50)
  minPercent: 40,               // Minimum passing percentage (35-55)
  paperPattern: {
    wp1: { questions: 50, duration: 60, marks: 100 },
    wp2: { questions: 50, duration: 60, marks: 100 },
    wp3: { questions: 50, duration: 60, marks: 100 },
    pr1: { questions: 0, duration: 30, marks: 50 },   // Set questions > 0 to enable
    pr2: { questions: 0, duration: 30, marks: 50 },   // Set questions = 0 to disable
    pr3: { questions: 0, duration: 30, marks: 50 },
    pr4: { questions: 0, duration: 30, marks: 50 },
    pr5: { questions: 0, duration: 30, marks: 50 },
    oral: { questions: 0, duration: 15, marks: 50 }
  }
}
```

### **Paper Pattern Fields**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `questions` | Number | Number of questions in paper (0 to disable) | 50 |
| `duration` | Number | Exam duration in minutes | 60 |
| `marks` | Number | Total marks for paper | 100 |

### **Paper Types**

| Type | Field | Description |
|------|--------|-------------|
| WP-I | wp1 | Written Paper I |
| WP-II | wp2 | Written Paper II |
| WP-III | wp3 | Written Paper III |
| PR-I | pr1 | Practical Test I |
| PR-II | pr2 | Practical Test II |
| PR-III | pr3 | Practical Test III |
| PR-IV | pr4 | Practical Test IV |
| PR-V | pr5 | Practical Test V |
| ORAL | oral | Oral Examination |

## 📚 **Default Trade Configurations**

### **1. JE NE REMUST**
- **Negative Marking**: 0.25
- **Passing %**: 40%
- **Written Papers**: WP-I, WP-II, WP-III (50 questions, 60 mins, 100 marks)
- **Practical**: All PR types enabled (30 mins, 50 marks each)
- **Oral**: Enabled (15 mins, 50 marks)

### **2. OCC CL-II**
- **Negative Marking**: 0.33
- **Passing %**: 45%
- **Written Papers**: WP-I, WP-II, WP-III (60 questions, 90 mins, 100 marks)
- **Practical**: All PR types enabled (45 mins, 100 marks each)
- **Oral**: Enabled (20 mins, 100 marks)

### **3. TECH GD**
- **Negative Marking**: 0.50
- **Passing %**: 50%
- **Written Papers**: WP-I, WP-II, WP-III (75 questions, 120 mins, 100 marks)
- **Practical**: All PR types enabled (60 mins, 100 marks each)
- **Oral**: Enabled (30 mins, 100 marks)

### **4. SKT (TECH)**
- **Negative Marking**: 0.25
- **Passing %**: 40%
- **Written Papers**: WP-I, WP-II, WP-III (50 questions, 60 mins, 100 marks)
- **Practical**: All PR types enabled (30 mins, 50 marks each)
- **Oral**: Enabled (15 mins, 50 marks)

### **5. Havildar**
- **Negative Marking**: 0.20
- **Passing %**: 35%
- **Written Papers**: WP-I, WP-II, WP-III (40 questions, 45 mins, 100 marks)
- **Practical**: All PR types enabled (20 mins, 50 marks each)
- **Oral**: Enabled (10 mins, 50 marks)

### **6. Naib Subedar**
- **Negative Marking**: 0.15
- **Passing %**: 35%
- **Written Papers**: WP-I, WP-II, WP-III (40 questions, 45 mins, 100 marks)
- **Practical**: All PR types enabled (20 mins, 50 marks each)
- **Oral**: Enabled (10 mins, 50 marks)

### **7. Lance Naik**
- **Negative Marking**: 0.10
- **Passing %**: 35%
- **Written Papers**: WP-I, WP-II, WP-III (40 questions, 45 mins, 100 marks)
- **Practical**: All PR types enabled (20 mins, 50 marks each)
- **Oral**: Enabled (10 mins, 50 marks)

### **8. Nursing Assistant**
- **Negative Marking**: 0.20
- **Passing %**: 45%
- **Written Papers**: WP-I, WP-II, WP-III (60 questions, 90 mins, 100 marks)
- **Practical**: All PR types enabled (45 mins, 100 marks each)
- **Oral**: Enabled (20 mins, 100 marks)

### **9. Clerk (SD)**
- **Negative Marking**: 0.15
- **Passing %**: 40%
- **Written Papers**: WP-I, WP-II, WP-III (30 questions, 30 mins, 100 marks)
- **Practical**: All PR types enabled (15 mins, 50 marks each)
- **Oral**: Enabled (10 mins, 50 marks)

### **10. Cook (GD)**
- **Negative Marking**: 0.33
- **Passing %**: 45%
- **Written Papers**: WP-I, WP-II, WP-III (60 questions, 90 mins, 100 marks)
- **Practical**: All PR types enabled (45 mins, 100 marks each)
- **Oral**: Enabled (20 mins, 100 marks)

### **11. Artificer (SM)**
- **Negative Marking**: 0.25
- **Passing %**: 40%
- **Written Papers**: WP-I, WP-II, WP-III (50 questions, 60 mins, 100 marks)
- **Practical**: All PR types enabled (30 mins, 50 marks each)
- **Oral**: Enabled (15 mins, 50 marks)

## 🔧 **Custom Trade Creation**

### **Adding New Trades**

To add a new trade, modify the `tradesWithConfig` array in `seedTrades.js`:

```javascript
{
  name: "NEW_TRADE_NAME",
  negativeMarking: 0.25,
  minPercent: 40,
  paperPattern: {
    wp1: { questions: 50, duration: 60, marks: 100 },
    wp2: { questions: 50, duration: 60, marks: 100 },
    wp3: { questions: 50, duration: 60, marks: 100 },
    pr1: { questions: 0, duration: 30, marks: 50 },  // Set to 0 to disable
    pr2: { questions: 0, duration: 30, marks: 50 },  // Set to 0 to disable
    pr3: { questions: 0, duration: 30, marks: 50 },  // Set to 0 to disable
    pr4: { questions: 0, duration: 30, marks: 50 },  // Set to 0 to disable
    pr5: { questions: 0, duration: 30, marks: 50 },  // Set to 0 to disable
    oral: { questions: 0, duration: 15, marks: 50 }   // Set to 0 to disable
  }
}
```

### **Disabling Paper Types**

To disable a specific paper type for a trade:
- Set `questions: 0` for that paper type
- The system will automatically set the corresponding boolean field to `false`

### **Enabling Paper Types**

To enable a specific paper type for a trade:
- Set `questions: > 0` for that paper type
- The system will automatically set the corresponding boolean field to `true`

## 📊 **Negative Marking Guidelines**

| Trade Type | Recommended Negative Marking |
|------------|---------------------------|
| Technical Trades | 0.10 - 0.25 |
| General Duty | 0.15 - 0.20 |
| Officer Ranks | 0.10 - 0.15 |
| Medical/Nursing | 0.20 - 0.25 |

## ⏱️ **Duration Guidelines**

| Paper Type | Recommended Duration |
|------------|-------------------|
| WP-I | 45-60 minutes |
| WP-II | 45-90 minutes |
| WP-III | 45-120 minutes |
| PR-I to PR-V | 15-45 minutes |
| ORAL | 10-30 minutes |

## 🎯 **Best Practices**

### **1. Consistency**
- Use consistent marking schemes within trade categories
- Align duration with question complexity
- Set appropriate passing percentages

### **2. Trade Categories**
- **Technical Trades**: Higher negative marking, longer durations
- **Support Trades**: Moderate negative marking, standard durations
- **Leadership Trades**: Lower negative marking, shorter durations

### **3. Quality Assurance**
- Review trade configurations before seeding
- Test with sample candidates
- Validate exam patterns work correctly

## 🚀 **Implementation Steps**

### **1. Prepare Environment**
```bash
cd server
cp .env.example .env
# Edit .env with your database configuration
```

### **2. Generate Prisma Client**
```bash
npx prisma generate
```

### **3. Run Seeding**
```bash
# Comprehensive seeding (trades + sample questions)
npm run seed

# Trade-only seeding
npm run seed-trades
```

### **4. Verification**
```bash
# Check database contents
npx prisma studio

# Test registration flow
npm start
# Navigate to http://localhost:3000
```

## 📞 **Support**

For issues with seeding:
1. Check console output for error messages
2. Verify database connection in `.env`
3. Ensure Prisma client is generated
4. Check trade configuration format

The seeding system is designed to be flexible and extensible for future trade additions and modifications!
