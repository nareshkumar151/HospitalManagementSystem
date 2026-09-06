USE HMS_DB;
GO

/* ---------------------------------------------------------------------------
   Replaces the placeholder consent template text seeded in 08_Schema_Consents.sql
   with the hospital's actual paper consent form wording (General/Surgery/
   Anesthesia/Transfusion/LAMA/procedure-specific), so the captured record and
   its PDF show the same legal language patients actually sign on paper.
   --------------------------------------------------------------------------- */

UPDATE ConsentTemplates SET BodyText = N'1. I am asking for medical care and treatment at this facility, and I agree to accept services which may involve diagnosing my medical condition(s), and procedures to treat my condition and provide medical care.

2. I understand that my agreement to accept these services is called a General Consent, and that it includes any routine procedures or treatments, such as blood drawing, physical examination, administration of medication, taking X-rays, ECG, use of local anaesthesia, and other non-invasive procedures.

3. I understand that these services will be provided to me by physicians, nurses, physician assistants, and other healthcare providers.

4. I acknowledge that informed consent may be needed separately for certain specific diagnostic and surgical procedures.

5. I acknowledge that the result of medical treatment, including any surgical procedures, may not be adequately predicted, and that neither the hospital nor the attending medical staff can give or is allowed to give a full guarantee or confirmation on the outcome of the treatment I receive.

6. I understand that my agreement to accept these services will remain in effect unless I state that I no longer want these services, or until my treatment is completed.

7. I hereby give consent for this treatment with my own free will, and keep the hospital authorities, doctors and staff indemnified against any losses occurring due to unforeseen consequences.

8. Financial agreement: I agree that, by signing, as the patient or a representative of the patient, I am obligated to pay the hospital bill for services rendered. It is clearly understood that estimated charges may differ from the final bill depending on the actual services rendered, and that the running bill should be settled within the specified period during my stay at the hospital. If covered by an Insurance Company, I agree to fully settle my treatment claim through a written Guarantee of Payment (GOP).

9. I acknowledge receiving the handouts of patient rights and responsibilities, which help me understand clearly, and I was informed that I could raise any queries or doubts I have related to the same.

10. Personal valuables: it is understood that during hospitalisation I am not supposed to bring any valuables to the hospital, and the hospital shall not be held responsible or liable for any loss or damage to such items.'
WHERE Code = 'GENERAL_CONSENT';
GO

UPDATE ConsentTemplates SET BodyText = N'I have been explained the proposed procedure/course of treatment and the following has been discussed with me:
A. The intended benefits of the procedure.
B. The significant, unavoidable, or frequently-occurring risks.
C. The alternatives to the procedure and their consequences.

Statement of Patient: Please read this form carefully. If you have any further questions, do ask - we are here to help you. You have the right to change your mind at any time, including after you have signed this form.

On the basis of the above statements, I have signed this consent knowingly, freely and voluntarily, and agree to be bound by its terms. I, the undersigned, hereby certify that I have read the above information, or that it has been read to me in a language that I can understand. I hereby absolve the hospital and its surgical team and hospital staff of any liability for consequences arising because of the above-mentioned surgery/procedure.

I agree to the proposed course of treatment described in this form. I understand that where the hospital cannot guarantee that a particular person will perform the procedure, the person who performs it will have the appropriate experience. I understand that in an emergency situation it may not be possible to discuss all the risks, and that any procedure in addition to those described on this form will only be carried out if it is necessary to save my life or prevent serious harm to my health.

I understand that any photographs/images taken of me during the procedure will be part of my confidential treatment records. I have been told about additional procedures which may become necessary during my treatment.

Consent of Patient Representative/Surrogate: where the patient is unable to give consent because he/she is a minor, physically challenged, mentally challenged, or unconscious, the undersigned representative therefore gives consent on behalf of the patient after discussion with the doctor for the above-mentioned surgery/procedure.'
WHERE Code = 'SURGERY_CONSENT';
GO

UPDATE ConsentTemplates SET BodyText = N'I give my full consent, as an act of my own free will, to undergo anesthesia (Local / General / Spinal / Epidural / Nerve Block / Combined / Monitored Anesthesia Care) required for my surgery/procedure at this hospital, administered by the anesthesia team and their associates.

I understand that the anesthetic agent may be administered by injecting it into the bloodstream (I.V. line), by breathing it into the lungs, or by injection through a needle/catheter placed directly into the spinal cord at the subarachnoid space or the epidural space; a nerve block is achieved by injecting the anesthetic agent near the nerves.

I understand that the results and effects of anesthesia depend on the type administered, and can vary from a temporary decrease in feeling/numbness and loss of movement, to a total unconscious state.

I have been explained that all forms of anesthesia involve some risk, and that no guarantees or promises can be made concerning the results of the procedure/treatment. I understand there are infrequent complications that can occur due to the use of anesthesia. These include bruising, pain or injury at the site of injection, temporary breathing difficulties, temporary nerve damage, muscle pains, asthmatic reactions, headaches, the possibility of sensation/awareness during the operation (especially with Caesarean section and some emergency procedures), damage to teeth and dental prostheses, lip and tongue, temporary difficulty in speaking or hoarseness of voice, and seizures.

There can also be some very rare but serious complications, including: heart attack, stroke, severe allergic or sensitivity reactions, brain damage, kidney or liver failure, lung damage, paralysis, permanent nerve or blood vessel damage, eye injury, damage to the larynx (voice box) and vocal cords, and infection from blood transfusion. The possibility of a more serious complication, including death, is quite remote, but it does exist.

I have been explained, in the language known and understood by me, the nature of the surgery/procedure, the type of anesthesia used, and its costs, risks, alternatives and prognosis. I understand that local anesthesia with or without sedation may not be successful, and therefore an alternative method may be used as deemed necessary.

I hereby absolve this hospital and its anesthesia/surgical team and hospital staff of any liability for consequences arising because of the above-mentioned surgery/procedure. Where the patient is unable to give consent because he/she is a minor or unconscious, the undersigned representative therefore gives consent on behalf of the patient after discussion with the doctor.'
WHERE Code = 'ANESTHESIA_CONSENT';
GO

UPDATE ConsentTemplates SET BodyText = N'I, the undersigned, hereby authorize my doctor and his/her associates and assistants, as may be selected and supervised by them, to perform a transfusion of blood/blood products such as packed red blood cells, fresh frozen plasma, platelets, or cryoprecipitate, as needed for my treatment.

Risks associated with transfusion: it has been explained to me that although all blood and blood products are, by law, tested for the presence of potential transmissible infectious agents, including those known to cause AIDS, hepatitis and syphilis, it is not possible to completely eliminate the potential transmission of every harmful disease, but the risk to me is minimal.

I also understand that on rare occasions transfusion reactions occur and may result in difficulty breathing, fever, pain, chills, nausea, jaundice, kidney damage, clotting disorders, anemia, heart failure, and even death.

I am aware that, in addition to the risks described, there are other foreseeable risks which have been discussed with me. I have been informed that there is a risk of infectious disease transmission despite careful donor selection and testing of blood products prior to use. I shall not hold the hospital and/or doctors legally or financially responsible for any risks/complications arising from the transfusion of blood and blood products.

I have been given an opportunity to ask questions about my condition and the need for transfusion, including alternative forms of therapy, and I believe I have received sufficient information to make this informed decision.

On the basis of the above statements, I hereby consent to the transfusion, knowingly, freely and voluntarily, and agree to be bound by its terms.'
WHERE Code = 'TRANSFUSION_CONSENT';
GO

UPDATE ConsentTemplates SET BodyText = N'I, the undersigned, hereby authorize my doctor and his/her associates and assistants to perform a transfusion of blood/blood products as needed for my treatment, and have had the same risks explained to me as with the informed consent for transfusion (see risks: possible transmission of infectious disease despite testing, and rare but serious transfusion reactions including difficulty breathing, fever, kidney damage, clotting disorders, heart failure, and death).

On the basis of the above statements, I do not consent to the transfusion, and I understand that the risk associated with this refusal may include permanent injury to me or possible death. I accept full responsibility for those risks.

As a doctor, I declare that all the queries raised by the patient/patient representative have been answered to his/her satisfaction, in a language that he/she can understand.

In case the patient is unable to give consent or is a minor, the legal guardian/representative shall give consent/refusal on behalf of the patient, and accordingly all understandings and acknowledgements mentioned above shall be deemed to be made by the patient.'
WHERE Code = 'TRANSFUSION_REFUSAL';
GO

UPDATE ConsentTemplates SET BodyText = N'I hereby, on my own will, authorize the hospital to stop further treatment of any sort for myself/my patient.

The patient is leaving the hospital against the advice of the treating doctor. The doctor has explained to me the consequences which may follow leaving the hospital, clearly in a language that I know. I wish to state that I do not hold the treating doctor, the hospital, or anyone else related with the hospital, responsible for any complications he/she develops, including death.

I abide by the medico-legal procedures following the discharge.

The above has been explained to me, and I have fully understood the same, and I am signing this consent-cum-undertaking by my own free will and in a fully alert state of mind, after taking independent advice.'
WHERE Code = 'LAMA_CONSENT';
GO

UPDATE ConsentTemplates SET BodyText = N'Nature of Procedure: I understand the nature of the specific procedure named for me below, including how it will be performed and why it is being recommended.

Purpose of Procedure: the purpose of this procedure is to treat/relieve the condition diagnosed by my doctor, as explained to me.

Risks and Complications: I have been explained the common, uncommon and rare risks and complications associated with this procedure, including (but not limited to) bleeding, pain, infection, injury to nearby structures, incomplete resolution of my condition, and anesthesia-related complications.

Anesthesia: I understand that this procedure will be performed under the anesthesia recommended by my doctor/anesthetist, and that the risks of anesthesia have been separately explained to me.

Permission for Additional Procedures: if unexpected findings occur during the procedure, I authorize the doctor to perform any additional procedures that they consider necessary.

No Guarantee: I understand that the outcome of this procedure is not guaranteed, and that further treatment may become necessary.

Patient Declaration: I have read and understood all of the above, and I give my consent for the named procedure.

Surgeon''s Declaration: I have explained the procedure, its risks, benefits and alternatives to the patient.'
WHERE Code = 'PROCEDURE_CONSENT';
GO
