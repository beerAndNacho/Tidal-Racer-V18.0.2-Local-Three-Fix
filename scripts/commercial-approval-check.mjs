import fs from 'node:fs';

const audit=fs.readFileSync('scripts/release-audit.mjs','utf8'),approval=JSON.parse(fs.readFileSync('release/commercial-approval.example.json','utf8')),templates=['release/EULA.example.md','release/PRIVACY.example.md','release/SUPPORT_POLICY.example.md'],tests=[],add=(name,ok)=>tests.push({name,ok:Boolean(ok)});
add('three legal review templates exist',templates.every(file=>fs.existsSync(file)&&fs.readFileSync(file,'utf8').includes('REVIEW TEMPLATE')));
add('templates do not claim approved legal text',templates.every(file=>fs.readFileSync(file,'utf8').includes('not approved')));
add('approval captures publisher and reviewer',['publisherLegalName','legalReviewer','approvedAt','signature'].every(key=>key in approval));
add('approval captures territories and storefronts',Array.isArray(approval.territories)&&Array.isArray(approval.storefronts));
add('approval captures rating, price and currency',['ageRating','price','currency'].every(key=>key in approval));
add('all legal and rights flags default false',['eulaApproved','privacyApproved','supportPolicyApproved','refundDisclosureApproved','ageRatingApproved','trademarkReviewCompleted','marketingRightsReviewed'].every(key=>approval[key]===false));
add('audit requires final non-template documents',audit.includes("legalFiles=['release/EULA.md','release/PRIVACY.md','release/SUPPORT_POLICY.md']")&&audit.includes('REVIEW TEMPLATE'));
add('audit requires signed commercial approval',audit.includes("release/commercial-approval.json")&&audit.includes('commercialApproval.signature'));
add('placeholder approval cannot pass',/REPLACE_WITH/.test(JSON.stringify(approval))&&approval.price===0);

let failed=0;for(const test of tests){console.log(`${test.ok?'PASS':'FAIL'} ${test.name}`);if(!test.ok)failed++}console.log(`\n${tests.length-failed}/${tests.length} commercial approval checks PASS`);process.exit(failed?1:0);
