import { createPostgrestClient } from "./src/lib/postgrest";

async function check() {
    try {
        const client = createPostgrestClient();
        console.log("Checking anthropometry_records table...");

        const { data, error, count } = await client
            .from("anthropometry_records")
            .select("*", { count: 'exact' });

        if (error) {
            console.error("Error:", error);
            return;
        }

        console.log(`Total records in table: ${count}`);
        if (data && data.length > 0) {
            console.log("Samples (first 2):");
            console.log(JSON.stringify(data.slice(0, 2), null, 2));

            const patientIds = [...new Set(data.map(d => d.patient_id))];
            console.log("Unique Patient IDs found in DB:", patientIds);
        } else {
            console.log("Table is empty.");
        }

    } catch (e) {
        console.error("Exception:", e);
    }
}

check();
