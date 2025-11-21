const query = `
SELECT
u.full_name,
u.email,
u.phone_number,
u.is_active,
json_agg(
json_build_object(
'propertyId', p.property_id,
'ownerId',p.user_id,
'title', p.title,
'address', p.address_line_1,
'city', p.city,
'areaName',p.area_name,
'description',p.description,
'monthlyfees',p.monthly_rent_base,
'refundable',p.is_deposit_refundable,
'totalBeds',p.total_beds_in_room,
'isPrivateBathroom',p.is_private_bathroom,
'genderPreference:',p.gender_preference,
'isSmokingAllowed',p.is_smoking_allowed,
'isForStudent',p.is_for_students,
'type',p.type,
'near me',p.near_me,

              'included_amenities', (
                  SELECT json_agg(DISTINCT a.amenity_name)
                  FROM property_amenities pa
                  JOIN pg_amenities a ON a.amenity_id = pa.amenity_id
                  WHERE pa.property_id = p.property_id
              ),
              'images', (
                  SELECT json_agg(DISTINCT ph.image_url)
                  FROM pg_photos ph
                  WHERE ph.property_id = p.property_id
              )
          )
      ) FILTER (WHERE p.property_id IS NOT NULL) AS pgdetails
    FROM users u
    LEFT JOIN pg_properties p ON p.user_id = u.user_id
    GROUP BY u.user_id;

    `;
