require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixBucket() {
  console.log("Checking buckets...");
  const { data: buckets, error: getError } = await supabase.storage.listBuckets();
  if (getError) {
    console.error("Error fetching buckets:", getError);
    return;
  }
  
  const reportsBucket = buckets.find(b => b.name === 'reports');
  if (!reportsBucket) {
    console.log("Bucket 'reports' not found. Creating it...");
    const { data, error } = await supabase.storage.createBucket('reports', { public: false });
    if (error) {
      console.error("Error creating bucket:", error);
    } else {
      console.log("Bucket created successfully.");
    }
  } else {
    console.log("Bucket 'reports' exists. Making it private...");
    const { data, error } = await supabase.storage.updateBucket('reports', { public: false });
    if (error) {
      console.error("Error updating bucket:", error);
    } else {
      console.log("Bucket updated to private successfully.");
    }
  }
}

fixBucket();
