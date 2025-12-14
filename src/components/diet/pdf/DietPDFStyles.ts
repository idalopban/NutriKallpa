import { StyleSheet, Font } from '@react-pdf/renderer';

// Register fonts if needed (using default Helvetica for now as requested)
// Font.register({ family: 'Roboto', src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf' });

export const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#333333',
        backgroundColor: '#FFFFFF',
    },

    // Header
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        borderBottomWidth: 2,
        borderBottomColor: '#4CAF50', // Green accent
        paddingBottom: 10,
    },
    headerLeft: {
        flexDirection: 'column',
        width: '40%',
    },
    headerRight: {
        flexDirection: 'column',
        width: '40%',
        alignItems: 'flex-end',
    },
    logoPlaceholder: {
        width: 50,
        height: 50,
        backgroundColor: '#E0E0E0',
        marginBottom: 5,
        borderRadius: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoText: {
        fontSize: 8,
        color: '#888',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2E7D32', // Darker green
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 10,
        color: '#666',
    },
    headerLabel: {
        fontSize: 8,
        color: '#888',
        marginTop: 2,
    },
    headerValue: {
        fontSize: 10,
        fontWeight: 'bold',
    },

    // Section
    section: {
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        paddingBottom: 3,
    },

    // Dashboard / Summary
    dashboardContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    macroCard: {
        width: '30%',
        backgroundColor: '#F5F5F5',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
    },
    macroTitle: {
        fontSize: 10,
        color: '#666',
        marginBottom: 5,
    },
    macroValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    microTable: {
        width: '100%',
        marginTop: 10,
    },
    microRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 3,
        borderBottomWidth: 0.5,
        borderBottomColor: '#EEE',
    },

    // Weekly Plan
    dayContainer: {
        marginBottom: 15,
        breakInside: 'avoid', // Try to keep days together
    },
    dayTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        backgroundColor: '#E8F5E9', // Light green
        padding: 5,
        marginBottom: 5,
        color: '#1B5E20',
    },

    // Table
    table: {
        width: '100%',
        borderWidth: 0,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        borderBottomWidth: 1,
        borderBottomColor: '#DDD',
        paddingVertical: 4,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 0.5,
        borderBottomColor: '#EEE',
        paddingVertical: 6,
        minHeight: 30,
    },
    colMeal: { width: '15%', paddingLeft: 5 },
    colDish: { width: '40%' },
    colIngredients: { width: '35%' },
    colCalories: { width: '10%', textAlign: 'right', paddingRight: 5 },

    cellText: { fontSize: 9 },
    cellTextBold: { fontSize: 9, fontWeight: 'bold' },
    cellTextSmall: { fontSize: 8, color: '#666', marginTop: 2 },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: 'center',
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        paddingTop: 10,
    },
    footerText: {
        fontSize: 8,
        color: '#999',
    },
    pageNumber: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        fontSize: 8,
        color: '#999',
    },

    // Progress Bar Simulation
    progressBarContainer: {
        height: 4,
        width: '100%',
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
        marginTop: 5,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 2,
    },
});
