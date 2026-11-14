#!/usr/bin/env python3
"""Download the published OHFA workbook and prepare the Trumbull directory CSV.
Fail closed on source layout or expected record-count drift.
"""
import csv
import io
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
import zipfile

URL="https://ohiohome.org/news/documents/FederalSubsidyResidentialRentalPropertiesList-26.xlsx"
NS="{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
HEADERS=["project_name","address","city","state","zip","parcel_id","owner","section_42_lihtc","section_202","section_811","section_8_program","section_515","section_538","section_521","source_updated","vacancy","rent","bedrooms","voucher_acceptance","data_classification","source_url"]

def extract(blob):
    with zipfile.ZipFile(io.BytesIO(blob)) as z:
        strings=[]
        with z.open("xl/sharedStrings.xml") as f:
            for _,elem in ET.iterparse(f,events=("end",)):
                if elem.tag==NS+"si":
                    strings.append("".join(x.text or "" for x in elem.iter(NS+"t")))
                    elem.clear()
        records=[]
        with z.open("xl/worksheets/sheet3.xml") as f:
            for _,elem in ET.iterparse(f,events=("end",)):
                if elem.tag!=NS+"row":continue
                cells=[None]*26
                for c in elem.findall(NS+"c"):
                    match=re.match(r"([A-Z]+)",c.get("r",""))
                    if not match:continue
                    index=0
                    for char in match.group(1):index=index*26+ord(char)-64
                    if not 1<=index<=26:continue
                    v=c.find(NS+"v")
                    if v is not None:
                        value=strings[int(v.text)] if c.get("t")=="s" else v.text
                    else:value="".join(x.text or "" for x in c.iter(NS+"t"))
                    cells[index-1]=value or None
                if elem.get("r")=="2":
                    expected=["County","Project Name","Building Address","Building City","Building State","Building ZIP Code"]
                    if cells[:6]!=expected:raise ValueError("Unexpected OHFA source columns")
                elif (cells[0] or "").strip().upper()=="TRUMBULL":
                    records.append(cells)
                elem.clear()
    return records

def main():
    req=urllib.request.Request(URL,headers={"User-Agent":"HousingIntel-OHFA-Directory/1.0"})
    with urllib.request.urlopen(req,timeout=45) as resp:
        blob=resp.read(25_000_001)
    if len(blob)>25_000_000:raise ValueError("Workbook too large")
    records=extract(blob)
    if len(records)!=164:raise ValueError(f"Expected 164 records; got {len(records)}")
    if sum(r[11]=="Yes" for r in records)!=98:raise ValueError("Section 8 flag count drift")
    with open(sys.argv[1],"w",newline="",encoding="utf-8") as f:
        writer=csv.DictWriter(f,fieldnames=HEADERS)
        writer.writeheader()
        for r in records:
            writer.writerow(dict(zip(HEADERS,[
                r[1],r[2],r[3],r[4],str(r[5]).zfill(5),r[6],r[7],
                *r[8:15],r[25],"UNVERIFIED","","","UNVERIFIED",
                "PROPERTY_DIRECTORY_NOT_LIVE_LISTING",URL
            ])))
    print("Prepared 164 Trumbull directory rows from published OHFA workbook")

if __name__=="__main__":main()
