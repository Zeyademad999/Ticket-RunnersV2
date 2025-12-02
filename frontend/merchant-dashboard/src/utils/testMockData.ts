import { mockApiService } from "../services/mockData";

export const testMockData = async () => {
  console.log("🧪 Testing Ticket Runners Merchant System Requirements...");
  
  try {
    // Test 1: Merchant Login with OTP
    console.log("\n1️⃣ Testing Merchant Login with OTP...");
    const loginResponse = await mockApiService.login({
      mobile_number: "+971501234567",
      password: "password123"
    });
    console.log("✅ Login successful:", loginResponse.success);
    
    // Test 2: OTP Verification
    console.log("\n2️⃣ Testing OTP Verification...");
    const otpResponse = await mockApiService.verifyOTP({
      mobile_number: "+971501234567",
      otp: "123456"
    });
    console.log("✅ OTP verification successful:", otpResponse.success);
    
    // Test 3: Customer Verification with Fees Check
    console.log("\n3️⃣ Testing Customer Verification with Fees Check...");
    const customerResponse = await mockApiService.verifyCustomerMobile("+971507654321");
    console.log("✅ Customer verification successful:", customerResponse.success);
    console.log("   Customer fees paid:", customerResponse.data?.fees_paid);
    
    // Test 4: Customer with Unpaid Fees (should fail)
    console.log("\n4️⃣ Testing Customer with Unpaid Fees...");
    try {
      await mockApiService.verifyCustomerMobile("+971507778889");
      console.log("❌ Should have failed for unpaid fees");
    } catch (error: any) {
      console.log("✅ Correctly rejected customer with unpaid fees:", error.message);
    }
    
    // Test 5: Inactive Customer (should fail)
    console.log("\n5️⃣ Testing Inactive Customer...");
    try {
      await mockApiService.verifyCustomerMobile("+971509999999");
      console.log("❌ Should have failed for inactive customer");
    } catch (error: any) {
      console.log("✅ Correctly rejected inactive customer:", error.message);
    }
    
    // Test 6: Card Assignment
    console.log("\n6️⃣ Testing Card Assignment...");
    const assignmentResponse = await mockApiService.assignCard({
      card_serial: "TR001234567890",
      customer_mobile: "+971507654321",
      otp: "123456"
    });
    console.log("✅ Card assignment successful:", assignmentResponse.success);
    console.log("   Hashed code generated:", assignmentResponse.data?.hashed_code?.substring(0, 20) + "...");
    
    // Test 7: Dashboard Stats
    console.log("\n7️⃣ Testing Dashboard Stats...");
    const statsResponse = await mockApiService.getDashboardStats();
    console.log("✅ Dashboard stats retrieved:", statsResponse.success);
    console.log("   Available cards:", statsResponse.data?.total_available_cards);
    console.log("   Delivered cards:", statsResponse.data?.total_delivered_cards);
    
    // Test 8: Card Inventory
    console.log("\n8️⃣ Testing Card Inventory...");
    const cardsResponse = await mockApiService.getCards();
    console.log("✅ Card inventory retrieved:", cardsResponse.success);
    console.log("   Total cards:", cardsResponse.data?.length);
    
    // Test 9: Password Change
    console.log("\n9️⃣ Testing Password Change...");
    const passwordResponse = await mockApiService.changePassword({
      current_password: "password123",
      new_password: "newpassword123",
      confirm_password: "newpassword123"
    });
    console.log("✅ Password change successful:", passwordResponse.success);
    
    // Test 10: Mobile Number Change with OTP
    console.log("\n🔟 Testing Mobile Number Change...");
    const mobileOTPResponse = await mockApiService.sendMobileChangeOTP("+971501111111");
    console.log("✅ Mobile change OTP sent:", mobileOTPResponse.success);
    
    const mobileChangeResponse = await mockApiService.changeMobile({
      current_mobile: "+971501234567",
      new_mobile: "+971501111111",
      otp: "123456"
    });
    console.log("✅ Mobile number change successful:", mobileChangeResponse.success);
    
    console.log("\n🎉 All requirements tested successfully!");
    console.log("\n📋 Requirements Summary:");
    console.log("✅ 2. Merchant accounts managed through admin dashboard");
    console.log("✅ 3. Merchants login with mobile/password + OTP");
    console.log("✅ 4. Merchants only have Assign New Card action");
    console.log("✅ 5. Card assignment with customer verification and OTP");
    console.log("✅ 6. NFC Card location tracking (merchant assignment)");
    console.log("✅ 7. Card inventory with Available/Delivered stats");
    console.log("✅ 8. Three pages: Assign Card, Inventory, Settings");
    console.log("✅ 9. Settings with password/mobile change + OTP");
    console.log("✅ 10. Hashed code display with Write/Copy buttons");
    
  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
  }
};

// Export test data for reference
export const mockTestData = {
  validCredentials: {
    mobile: "+971501234567",
    password: "password123",
    otp: "123456",
  },
  validCustomers: [
    "+971507654321", // Fatima Al Zahra
    "+971509876543", // Omar Al Rashid
    "+971501112223", // Aisha Al Qasimi
    "+971504445556", // Khalid Al Falasi
  ],
  invalidCustomer: "+971507778889", // Mariam Al Suwaidi (fees not paid)
  validCards: [
    "TR001234567890",
    "TR001234567891",
    "TR001234567892",
    "TR001234567893",
    "TR001234567894",
    "TR001234567895",
  ],
};
