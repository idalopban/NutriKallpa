import { calculateTDEE } from './src/lib/calculos-nutricionales';

console.log('--- VERIFICATION: SPANISH KEYS & NaN CHECK ---');

// 1. Test with Spanish key "moderada"
const spanishParams = {
    weight: 70,
    height: 170,
    age: 30,
    sex: 'masculino',
    activityLevel: 'moderada' as any, // Should map to 1.55
    formula: 'mifflin' as any,
    includeTEF: true
};

const result = calculateTDEE(spanishParams);
console.log('\nTest "moderada":');
console.log(`TDEE: ${result.tdee}`);
if (!isNaN(result.tdee) && result.tdee > 0) {
    console.log('✅ Spanish key "moderada" correctly calculated TDEE');
} else {
    console.log('❌ Spanish key "moderada" returned NaN or 0');
}

// 2. Test with edge case: missing height/weight
const edgeParams = {
    weight: 0,
    height: 0,
    age: 30,
    sex: 'masculino',
    activityLevel: 'moderada' as any,
    formula: 'mifflin' as any
};

const edgeResult = calculateTDEE(edgeParams);
console.log('\nTest 0 height/weight:');
console.log(`TDEE: ${edgeResult.tdee}`);
if (!isNaN(edgeResult.tdee) && edgeResult.tdee > 0) {
    console.log('✅ Edge case handles 0 values safely');
} else {
    console.log('❌ Edge case returned NaN or 0');
}

// 3. pediatric with Spanish level
const pedSpanParams = {
    weight: 20,
    height: 110,
    age: 6,
    sex: 'masculino',
    activityLevel: 'activa' as any, // Should map to moderate (1.26) in IOM
    formula: 'iom' as any
};

const pedSpanResult = calculateTDEE(pedSpanParams);
console.log('\nPediatric "activa" (IOM):');
console.log(`TDEE: ${pedSpanResult.tdee}`);
if (pedSpanResult.tdee === 1662) {
    console.log('✅ Pediatric "activa" maps correctly to IOM moderate');
} else {
    console.log(`❌ Pediatric "activa" mismatch: Got ${pedSpanResult.tdee}, expected 1662`);
}
