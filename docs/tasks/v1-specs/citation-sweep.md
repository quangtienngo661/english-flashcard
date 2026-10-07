# Bảng kiểm kê trích dẫn — v1-specs

Sinh bằng script ngày 05/10/2026 từ 8 spec; mỗi dòng là một tiêu chí hoặc trường hợp biên. **Mức** gồm: `decision` (quyết định hoặc mặc định của chủ dự án, kèm nhãn riêng ở nguồn), `verified` (đã chạy), `documented (02/10)` hoặc `documented (04/10)` (đã đọc nguồn), `ASSUMPTION` (không có nguồn), `rule-ref` (trích một quy tắc của chính spec, mức của quy tắc đó nằm ở cột Nguồn của quy tắc), `+A` (có một phần `ASSUMPTION`).

Tổng hợp: ASSUMPTION: 89, decision: 122, decision +A: 2, documented (02/10): 17, documented (02/10) +A: 1, documented (04/10): 2, documented (04/10) +A: 1, documented (05/10): 1, documented (05/10) +A: 1, rule-ref: 33, verified: 14

| Spec | # | Trích dẫn | Mức |
|---|---|---|---|
| system | S1 | R10 | documented (02/10) |
| system | S2 | R11 | documented (02/10) |
| system | S3 | ASSUMPTION | ASSUMPTION |
| system | S4 | R12 | documented (02/10) |
| system | S5 | R12 | documented (02/10) |
| system | S6 | ASSUMPTION | ASSUMPTION |
| system | S7 | K1 | decision |
| system | S8 | K4 | decision |
| system | S9 | K4 | decision |
| system | S10 | K3 | decision |
| system | S11 | F36 | decision |
| system | S12 | F2 | decision |
| system | S13 | F4 | decision |
| system | S14 | R15 | documented (02/10) |
| system | S15 | SR8 (`ASSUMPTION`) | ASSUMPTION |
| system | S16 | R12 | documented (02/10) |
| system | S17 | SR11 (`ASSUMPTION`) | ASSUMPTION |
| system | SE1 | SR11 (`ASSUMPTION`) | ASSUMPTION |
| system | SE2 | R12 (key may be dropped after ≥24 h); behaviour `ASSUMPTION` | documented (02/10) +A |
| system | SE3 | ASSUMPTION | ASSUMPTION |
| system | SE4 | F19 | decision |
| system | SE5 | ASSUMPTION | ASSUMPTION |
| system | SE6 | SR11 (`ASSUMPTION`) | ASSUMPTION |
| content | C1 | K10 | decision |
| content | C2 | K10 | decision |
| content | C3 | F22 | decision |
| content | C4 | K11 | decision |
| content | C5 | K11 | decision |
| content | C6 | K11 | decision |
| content | C7 | S6 | rule-ref |
| content | C8 | F15 | decision |
| content | C9 | F15 | decision |
| content | C10 | F15 (`ASSUMPTION` number) | decision +A |
| content | C11 | F14 | decision |
| content | C12 | F14 | decision |
| content | C13 | K20 | decision |
| content | C14 | K20 | decision |
| content | C15 | K20 | decision |
| content | C16 | N13 | decision |
| content | C17 | K23 | decision |
| content | C18 | CR8 (`ASSUMPTION`) | ASSUMPTION |
| content | C19 | R14 | documented (02/10) |
| content | C20 | R6 | verified |
| content | C21 | CR7 (`ASSUMPTION`) | ASSUMPTION |
| content | C22 | K3 | decision |
| content | C23 | K15 | decision |
| content | C24 | CR23 (`ASSUMPTION`) | ASSUMPTION |
| content | CE1 | R3 | verified |
| content | CE2 | R7 | verified |
| content | CE3 | R4 | verified |
| content | CE4 | R8 | verified |
| content | CE5 | CR8 (`ASSUMPTION`) | ASSUMPTION |
| content | CE6 | N12 | decision |
| content | CE7 | R4 | verified |
| content | CE8 | ASSUMPTION | ASSUMPTION |
| content | CE9 | F14 | decision |
| content | CE10 | S11 | rule-ref |
| identity | I1 | K7 | decision |
| identity | I2 | K7 | decision |
| identity | I3 | K9 | decision |
| identity | I4 | F6 | decision |
| identity | I5 | F6 | decision |
| identity | I6 | F6 | decision |
| identity | I7 | F6 | decision |
| identity | I8 | R18 | documented (02/10) |
| identity | I9 | F8 | decision |
| identity | I10 | R19 | documented (02/10) |
| identity | I11 | IR6 (`ASSUMPTION` for the Google and reset exemption) | ASSUMPTION |
| identity | I12 | K7 | decision |
| identity | I13 | R24 (`ASSUMPTION` for refusing `email_verified` false) | documented (04/10) +A |
| identity | I14 | K8 | decision |
| identity | I15 | K8 | decision |
| identity | I16 | N2 | decision |
| identity | I17 | N2 | decision |
| identity | I18 | K6 | decision |
| identity | I19 | F9 | decision |
| identity | I20 | R20 | documented (02/10) |
| identity | I21 | K1 | decision |
| identity | I22 | K4 | decision |
| identity | I23 | K3 | decision |
| identity | I24 | K7 | decision |
| identity | I25 | IR18 (`ASSUMPTION`) | ASSUMPTION |
| identity | I26 | R18 | documented (02/10) |
| identity | I27 | IR19 (`ASSUMPTION`) | ASSUMPTION |
| identity | I28 | R47 | documented (04/10) |
| identity | IE1 | IR11 (`ASSUMPTION`) | ASSUMPTION |
| identity | IE2 | N2 | decision |
| identity | IE3 | IR15 (`ASSUMPTION`) | ASSUMPTION |
| identity | IE4 | R24 | documented (04/10) |
| identity | IE5 | R19 | documented (02/10) |
| identity | IE6 | IR19 | rule-ref |
| identity | IE7 | ASSUMPTION | ASSUMPTION |
| identity | IE8 | F10 | decision |
| identity | IE9 | IR3 (`ASSUMPTION`) | ASSUMPTION |
| identity | IE10 | ASSUMPTION | ASSUMPTION |
| identity | IE11 | IR18 (`ASSUMPTION`) | ASSUMPTION |
| identity | IE12 | IR1 (`ASSUMPTION`) | ASSUMPTION |
| identity | IE13 | IR7 (`ASSUMPTION`) | ASSUMPTION |
| identity | IE14 | IR11 (`ASSUMPTION`) | ASSUMPTION |
| identity | IE15 | IR8 (`ASSUMPTION`) | ASSUMPTION |
| learning | L1 | LR1 (`ASSUMPTION`) | ASSUMPTION |
| learning | L2 | F18 | decision |
| learning | L3 | LR2 | rule-ref |
| learning | L4 | S6 | rule-ref |
| learning | L5 | K11 | decision |
| learning | L6 | K14 | decision |
| learning | L7 | K21 | decision |
| learning | L8 | N8 | decision |
| learning | L9 | LR5 (`ASSUMPTION`) | ASSUMPTION |
| learning | L10 | SR8 | rule-ref |
| learning | L11 | N9 | decision |
| learning | L12 | F20 | decision |
| learning | L13 | K19 | decision |
| learning | L14 | LR9 (`ASSUMPTION`) | ASSUMPTION |
| learning | L15 | SR8 | rule-ref |
| learning | L16 | LR10 (`ASSUMPTION`) | ASSUMPTION |
| learning | L17 | K20 | decision |
| learning | L18 | CR17 | rule-ref |
| learning | L19 | F19 | decision |
| learning | L20 | K14 | decision |
| learning | L21 | LR2 (`ASSUMPTION`) | ASSUMPTION |
| learning | L22 | K3 | decision |
| learning | L23 | K22 | decision |
| learning | L24 | SR8 | rule-ref |
| learning | LE1 | N9 | decision |
| learning | LE2 | LR15 (`ASSUMPTION`) | ASSUMPTION |
| learning | LE3 | LR12 | rule-ref |
| learning | LE4 | F14 | decision |
| learning | LE5 | CR23 (`ASSUMPTION`) | ASSUMPTION |
| learning | LE6 | LR1 (`ASSUMPTION`) | ASSUMPTION |
| learning | LE7 | K20 | decision |
| learning | LE8 | ASSUMPTION | ASSUMPTION |
| learning | LE9 | LR3 | rule-ref |
| learning | LE10 | F5 | decision |
| learning | LE11 | LR7 (`ASSUMPTION`) | ASSUMPTION |
| pipeline | P1 | R14 | documented (02/10) |
| pipeline | P2 | R6 | verified |
| pipeline | P3 | F23 | decision |
| pipeline | P4 | R3 | verified |
| pipeline | P5 | R8 | verified |
| pipeline | P6 | R2 | verified |
| pipeline | P7 | R7 | verified |
| pipeline | P8 | R35 | documented (02/10) |
| pipeline | P9 | R32 | documented (02/10) |
| pipeline | P10 | F24 | decision |
| pipeline | P11 | K1 | decision |
| pipeline | P12 | CR17 | rule-ref |
| pipeline | P13 | CR9 | rule-ref |
| pipeline | P14 | PR15 (`ASSUMPTION`) | ASSUMPTION |
| pipeline | P15 | K1 | decision |
| pipeline | P16 | F22 | decision |
| pipeline | P17 | K1 | decision |
| pipeline | P18 | PR16 (`ASSUMPTION`) | ASSUMPTION |
| pipeline | P19 | F23 | decision |
| pipeline | P20 | PR14 (`ASSUMPTION`) | ASSUMPTION |
| pipeline | P21 | PR13 (`ASSUMPTION`) | ASSUMPTION |
| pipeline | P22 | PR15 (`ASSUMPTION`) | ASSUMPTION |
| pipeline | P23 | R14 | documented (02/10) |
| pipeline | P24 | PR5 (`ASSUMPTION`) | ASSUMPTION |
| pipeline | P25 | PR5 (`ASSUMPTION`) | ASSUMPTION |
| pipeline | P26 | PR16 (`ASSUMPTION`) | ASSUMPTION |
| pipeline | P27 | R46 | verified |
| pipeline | P28 | PR12 (`ASSUMPTION`) | ASSUMPTION |
| pipeline | PE1 | PR14 (`ASSUMPTION`) | ASSUMPTION |
| pipeline | PE2 | PR5 (`ASSUMPTION`) | ASSUMPTION |
| pipeline | PE3 | ASSUMPTION | ASSUMPTION |
| pipeline | PE4 | PR12 | rule-ref |
| pipeline | PE5 | PR12 (`ASSUMPTION`) | ASSUMPTION |
| pipeline | PE6 | PR5, PR15 (`ASSUMPTION`) | ASSUMPTION |
| pipeline | PE7 | CR17 (`ASSUMPTION`) | ASSUMPTION |
| pipeline | PE8 | R4 | verified |
| pipeline | PE9 | CR22 (`ASSUMPTION`) | ASSUMPTION |
| pipeline | PE10 | ASSUMPTION | ASSUMPTION |
| entitlements | E1 | F31 | decision |
| entitlements | E2 | K7 | decision |
| entitlements | E3 | K7 | decision |
| entitlements | E4 | ER3 (`ASSUMPTION`) | ASSUMPTION |
| entitlements | E5 | ER3 (`ASSUMPTION`) | ASSUMPTION |
| entitlements | E6 | F33 | decision |
| entitlements | E7 | F33 | decision |
| entitlements | E8 | ER5 (`ASSUMPTION`) | ASSUMPTION |
| entitlements | E9 | F33 | decision |
| entitlements | E10 | SR8 | rule-ref |
| entitlements | E11 | ER7 | rule-ref |
| entitlements | E12 | F32 | decision |
| entitlements | E13 | F31 | decision |
| entitlements | E14 | K1 | decision |
| entitlements | E15 | ER9 (`ASSUMPTION`) | ASSUMPTION |
| entitlements | E16 | ER14 (`ASSUMPTION`) | ASSUMPTION |
| entitlements | E17 | F35 | decision |
| entitlements | E18 | ER8 (`ASSUMPTION`) | ASSUMPTION |
| entitlements | E19 | K20 | decision |
| entitlements | E20 | K3 | decision |
| entitlements | E21 | ER5 (`ASSUMPTION`) | ASSUMPTION |
| entitlements | E22 | ER14 (`ASSUMPTION`) | ASSUMPTION |
| entitlements | E23 | ER6 (`ASSUMPTION`) | ASSUMPTION |
| entitlements | EE1 | ER3 (`ASSUMPTION`) | ASSUMPTION |
| entitlements | EE2 | ASSUMPTION | ASSUMPTION |
| entitlements | EE3 | ER5 (`ASSUMPTION`) | ASSUMPTION |
| entitlements | EE4 | ER11 (`ASSUMPTION`) | ASSUMPTION |
| entitlements | EE5 | ASSUMPTION (depends on K18) | decision +A |
| entitlements | EE6 | ER6 (`ASSUMPTION`) | ASSUMPTION |
| entitlements | EE7 | SR13 | rule-ref |
| entitlements | EE8 | ER14 (`ASSUMPTION`) | ASSUMPTION |
| ai | A1 | F43b | decision |
| ai | A2 | N5 | decision |
| ai | A3 | F28 | decision |
| ai | A4 | R41 (wait handling `ASSUMPTION`) | documented (05/10) +A |
| ai | A5 | F27 | decision |
| ai | A6 | AR3 | rule-ref |
| ai | A7 | AR5 | rule-ref |
| ai | A8 | AR5 | rule-ref |
| ai | A9 | AR5 | rule-ref |
| ai | A10 | F30 | decision |
| ai | A11 | F29 | decision |
| ai | A12 | AR8 (`ASSUMPTION`) | ASSUMPTION |
| ai | A13 | F27 | decision |
| ai | A14 | ER14 (`ASSUMPTION`) | ASSUMPTION |
| ai | A15 | AR2 | rule-ref |
| ai | A16 | N5 | decision |
| ai | A17 | F36 | decision |
| ai | A18 | AR11 (`ASSUMPTION`) | ASSUMPTION |
| ai | A19 | K3 | decision |
| ai | A20 | AR13 (`ASSUMPTION`) | ASSUMPTION |
| ai | A21 | AR5 (`ASSUMPTION`) | ASSUMPTION |
| ai | A22 | AR5 (`ASSUMPTION`) | ASSUMPTION |
| ai | A23 | F43 | decision |
| ai | AE1 | F27 | decision |
| ai | AE2 | ASSUMPTION | ASSUMPTION |
| ai | AE3 | K16 | decision |
| ai | AE4 | AR3 (`ASSUMPTION`) | ASSUMPTION |
| ai | AE5 | R42 | documented (05/10) |
| ai | AE6 | AR5 | rule-ref |
| ai | AE7 | F33 | decision |
| ai | AE8 | AR8 (`ASSUMPTION`) | ASSUMPTION |
| practice | Q1 | PRC3 | rule-ref |
| practice | Q2 | F42 | decision |
| practice | Q3 | F42 | decision |
| practice | Q4 | F38 | decision |
| practice | Q5 | R45 | documented (02/10) |
| practice | Q6 | F38 | decision |
| practice | Q7 | PRC12 (`ASSUMPTION`) | ASSUMPTION |
| practice | Q8 | F39 | decision |
| practice | Q9 | F40 | decision |
| practice | Q10 | F37 | decision |
| practice | Q11 | F37 | decision |
| practice | Q12 | F37 | decision |
| practice | Q13 | F31 | decision |
| practice | Q14 | PRC5 | rule-ref |
| practice | Q15 | K17 | decision |
| practice | Q16 | F41 | decision |
| practice | Q17 | F41 | decision |
| practice | Q18 | N4 | decision |
| practice | Q19 | K23 | decision |
| practice | Q20 | PRC18 | rule-ref |
| practice | Q21 | PRC25 (`ASSUMPTION`) | ASSUMPTION |
| practice | Q22 | N10 | decision |
| practice | Q23 | K24 | decision |
| practice | Q24 | PRC17 (`ASSUMPTION`) | ASSUMPTION |
| practice | Q25 | K22 | decision |
| practice | Q26 | PRC9 (`ASSUMPTION`) | ASSUMPTION |
| practice | Q27 | F36 | decision |
| practice | Q28 | K17 | decision |
| practice | Q29 | SR9 | rule-ref |
| practice | Q30 | K3 | decision |
| practice | Q31 | AR13 (`ASSUMPTION`) | ASSUMPTION |
| practice | Q32 | CR23 (`ASSUMPTION`) | ASSUMPTION |
| practice | Q33 | PRC5 (`ASSUMPTION`) | ASSUMPTION |
| practice | Q34 | PRC5 (`ASSUMPTION`) | ASSUMPTION |
| practice | Q35 | ER14 (`ASSUMPTION`) | ASSUMPTION |
| practice | Q36 | SR8 (`ASSUMPTION`) | ASSUMPTION |
| practice | QE1 | R6 | verified |
| practice | QE2 | PRC3 | rule-ref |
| practice | QE3 | F38 | decision |
| practice | QE4 | F38 | decision |
| practice | QE5 | PRC7 (`ASSUMPTION`) | ASSUMPTION |
| practice | QE6 | PRC26 | rule-ref |
| practice | QE7 | ASSUMPTION | ASSUMPTION |
| practice | QE8 | AR5 | rule-ref |
| practice | QE9 | SR8 | rule-ref |
| practice | QE10 | F38 | decision |
| practice | QE11 | SR14 | rule-ref |
| practice | QE12 | PRC18 | rule-ref |
