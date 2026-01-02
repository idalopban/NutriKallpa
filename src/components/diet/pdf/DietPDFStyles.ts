import { StyleSheet } from '@react-pdf/renderer';

export const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Helvetica',
        fontSize: 11,
        color: '#333333',
        backgroundColor: '#FFFFFF',
    },

    // Header
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 25,
        borderBottomWidth: 3,
        borderBottomColor: '#84CC16', // NutriKallpa Lime Green
        paddingBottom: 15,
    },
    headerLeft: {
        flexDirection: 'column',
        width: '50%',
    },
    headerRight: {
        flexDirection: 'column',
        width: '40%',
        alignItems: 'flex-end',
    },
    logo: {
        width: 120,
        height: 'auto',
        marginBottom: 8,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#365314', // Very dark green for contrast
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 11,
        color: '#65a30d', // Brand lime secondary
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    headerLabel: {
        fontSize: 9,
        color: '#888',
        marginTop: 4,
        textTransform: 'uppercase',
    },
    headerValue: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1a2e05',
    },

    // Section
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1a2e05',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#ecfccb', // Soft lime background
        paddingBottom: 5,
    },

    // Dashboard / Summary
    dashboardContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
        gap: 10,
    },
    macroCard: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    macroTitle: {
        fontSize: 10,
        color: '#6B7280',
        marginBottom: 4,
        textTransform: 'uppercase',
        fontWeight: 'bold',
    },
    macroValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    microTable: {
        width: '100%',
        marginTop: 5,
        backgroundColor: '#f7fee7',
        borderRadius: 8,
        padding: 10,
    },
    microRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 3,
        borderBottomWidth: 0.3,
        borderBottomColor: '#d9f99d',
    },

    // Weekly Plan
    dayContainer: {
        marginBottom: 20,
    },
    dayTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        backgroundColor: '#84CC16', // Brand lime
        padding: 8,
        marginBottom: 10,
        color: '#FFFFFF',
        borderRadius: 4,
    },

    // Table
    table: {
        width: '100%',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f8fafc',
        borderBottomWidth: 2,
        borderBottomColor: '#e2e8f0',
        paddingVertical: 8,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        paddingVertical: 10,
        alignItems: 'center',
    },

    // Checklist Circle
    checkbox: {
        width: 14,
        height: 14,
        borderWidth: 1.5,
        borderColor: '#84CC16',
        borderRadius: 4,
        marginRight: 10,
    },

    colMeal: { width: '20%', paddingLeft: 5, flexDirection: 'row', alignItems: 'center' },
    colDish: { width: '40%' },
    colIngredients: { width: '30%' },
    colCalories: { width: '10%', textAlign: 'right', paddingRight: 5 },

    cellText: { fontSize: 11, color: '#334155' },
    cellTextBold: { fontSize: 11, fontWeight: 'bold', color: '#0f172a' },
    cellTextSmall: { fontSize: 9, color: '#64748b', marginTop: 3 },

    // Footer
    footerText: {
        fontSize: 9,
        color: '#94a3b8',
        textAlign: 'center',
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        paddingTop: 10,
    },
    pageNumber: {
        position: 'absolute',
        bottom: 20,
        right: 40,
        fontSize: 9,
        color: '#94a3b8',
    },

    // Progress Bar
    progressBarContainer: {
        height: 5,
        width: '100%',
        backgroundColor: '#e2e8f0',
        borderRadius: 3,
        marginTop: 6,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#84CC16',
        borderRadius: 3,
    },
});
